import { query } from '../config/database.js';
import { sendSuccess, sendPaginated } from '../utils/responses.js';

export async function getGameHistory(req, res, next) {
  try {
    const userId = req.user.user_id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const type = req.query.type || 'all';
    const offset = (page - 1) * limit;

    const typeFilter = type !== 'all' ? `AND gs.session_type = '${type === 'solo' ? 'solo' : 'multiplayer'}'` : '';

    const mainQuery = `
      SELECT
        gs.id AS session_id,
        gs.session_type,
        gs.created_at AS played_at,
        gs.completed_at,
        q.title AS quiz_name,
        COUNT(pa.id) FILTER (WHERE pa.is_correct) AS score,
        (SELECT COUNT(sq.question_id) FROM session_questions sq WHERE sq.game_session_id = gs.id) AS total_questions,
        COUNT(pa.id) AS total_answered,
        COUNT(pa.id) FILTER (WHERE pa.is_correct) AS correct_answers,
        (SELECT COUNT(*) + 1 FROM (
          SELECT gp3.id, COUNT(pa3.id) AS correct_count
          FROM game_participants gp3
          LEFT JOIN participant_answers pa3 ON gp3.id = pa3.participant_id AND pa3.is_correct = true
          WHERE gp3.game_session_id = gs.id
          GROUP BY gp3.id
        ) ranked WHERE ranked.correct_count > (
          SELECT COUNT(pa4.id) FROM participant_answers pa4 WHERE pa4.participant_id = gp.id AND pa4.is_correct = true
        )) AS rank,
        (SELECT COUNT(*) FROM game_participants gp2
         WHERE gp2.game_session_id = gs.id) AS total_players
      FROM game_participants gp
      JOIN game_sessions gs ON gp.game_session_id = gs.id
      JOIN quizzes q ON gs.quiz_id = q.id
      LEFT JOIN participant_answers pa ON gp.id = pa.participant_id
      WHERE (gp.user_id = $1 OR (gp.user_id IS NULL AND gp.display_name = (SELECT username FROM users WHERE id = $1)))
        AND gs.status = 'completed'
        ${typeFilter}
      GROUP BY gs.id, gs.session_type, gs.created_at, gs.completed_at,
               q.title, gp.id
      ORDER BY gs.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT gs.id) AS total
      FROM game_participants gp
      JOIN game_sessions gs ON gp.game_session_id = gs.id
      WHERE (gp.user_id = $1 OR (gp.user_id IS NULL AND gp.display_name = (SELECT username FROM users WHERE id = $1)))
        AND gs.status = 'completed'
        ${typeFilter}
    `;

    const [mainResult, countResult] = await Promise.all([
      query(mainQuery, [userId, limit, offset]),
      query(countQuery, [userId]),
    ]);

    const totalCount = parseInt(countResult.rows[0].total);

    const games = mainResult.rows.map(row => ({
      sessionId: row.session_id,
      sessionType: row.session_type,
      playedAt: row.played_at,
      completedAt: row.completed_at,
      quizName: row.quiz_name,
      score: parseInt(row.score),
      totalQuestions: parseInt(row.total_questions),
      correctAnswers: parseInt(row.correct_answers),
      totalAnswered: parseInt(row.total_answered),
      accuracy: row.total_answered > 0
        ? Math.round((parseInt(row.correct_answers) / parseInt(row.total_answered)) * 100)
        : 0,
      rank: parseInt(row.rank),
      totalPlayers: parseInt(row.total_players),
    }));

    sendPaginated(res, games, page, limit, totalCount);
  } catch (error) {
    next(error);
  }
}

export async function getSummaryStats(req, res, next) {
  try {
    const userId = req.user.user_id;

    const aggregateQuery = `
      SELECT
        COUNT(DISTINCT gs.id) AS total_games,
        COALESCE((
          SELECT MAX(correct_per_game) FROM (
            SELECT COUNT(pa2.id) FILTER (WHERE pa2.is_correct) AS correct_per_game
            FROM game_participants gp2
            JOIN game_sessions gs2 ON gp2.game_session_id = gs2.id
            LEFT JOIN participant_answers pa2 ON gp2.id = pa2.participant_id
            WHERE (gp2.user_id = $1 OR (gp2.user_id IS NULL AND gp2.display_name = (SELECT username FROM users WHERE id = $1)))
              AND gs2.status = 'completed'
            GROUP BY gp2.id
          ) sub
        ), 0) AS best_score,
        COALESCE(SUM(CASE WHEN pa.is_correct THEN 1 ELSE 0 END), 0) AS total_correct,
        COALESCE(COUNT(pa.id), 0) AS total_answered,
        COALESCE((
          SELECT COUNT(*) FROM (
            SELECT gs2.id
            FROM game_participants gp2
            JOIN game_sessions gs2 ON gp2.game_session_id = gs2.id
            LEFT JOIN participant_answers pa2 ON gp2.id = pa2.participant_id
            WHERE (gp2.user_id = $1 OR (gp2.user_id IS NULL AND gp2.display_name = (SELECT username FROM users WHERE id = $1)))
              AND gs2.status = 'completed'
              AND (SELECT COUNT(*) FROM game_participants gp3 WHERE gp3.game_session_id = gs2.id) > 1
            GROUP BY gs2.id, gp2.id
            HAVING COUNT(pa2.id) FILTER (WHERE pa2.is_correct) >= ALL(
              SELECT COUNT(pa3.id) FILTER (WHERE pa3.is_correct)
              FROM game_participants gp3
              LEFT JOIN participant_answers pa3 ON gp3.id = pa3.participant_id
              WHERE gp3.game_session_id = gs2.id
              GROUP BY gp3.id
            )
          ) wins
        ), 0) AS win_count
      FROM game_participants gp
      JOIN game_sessions gs ON gp.game_session_id = gs.id
      LEFT JOIN participant_answers pa ON gp.id = pa.participant_id
      WHERE (gp.user_id = $1 OR (gp.user_id IS NULL AND gp.display_name = (SELECT username FROM users WHERE id = $1)))
        AND gs.status = 'completed'
    `;

    const avgRankQuery = `
      SELECT
        AVG(sub.rank)::numeric(10,1) AS avg_rank
      FROM (
        SELECT
          gp.id,
          (SELECT COUNT(*) + 1 FROM (
            SELECT gp3.id, COUNT(pa3.id) AS correct_count
            FROM game_participants gp3
            LEFT JOIN participant_answers pa3 ON gp3.id = pa3.participant_id AND pa3.is_correct = true
            WHERE gp3.game_session_id = gs.id
            GROUP BY gp3.id
          ) ranked WHERE ranked.correct_count > (
            SELECT COUNT(pa4.id) FROM participant_answers pa4 WHERE pa4.participant_id = gp.id AND pa4.is_correct = true
          )) AS rank
        FROM game_participants gp
        JOIN game_sessions gs ON gp.game_session_id = gs.id
        WHERE (gp.user_id = $1 OR (gp.user_id IS NULL AND gp.display_name = (SELECT username FROM users WHERE id = $1))) AND gs.status = 'completed'
      ) sub
    `;

    const streakQuery = `
      SELECT DISTINCT DATE(gs.created_at) AS play_date
      FROM game_participants gp
      JOIN game_sessions gs ON gp.game_session_id = gs.id
      WHERE (gp.user_id = $1 OR (gp.user_id IS NULL AND gp.display_name = (SELECT username FROM users WHERE id = $1))) AND gs.status = 'completed'
      ORDER BY play_date DESC
    `;

    const [aggregateResult, avgRankResult, streakResult] = await Promise.all([
      query(aggregateQuery, [userId]),
      query(avgRankQuery, [userId]),
      query(streakQuery, [userId]),
    ]);

    const agg = aggregateResult.rows[0];
    const totalGames = parseInt(agg.total_games);
    const bestScore = parseInt(agg.best_score);
    const totalCorrect = parseInt(agg.total_correct);
    const totalAnswered = parseInt(agg.total_answered);
    const winCount = parseInt(agg.win_count);
    const overallAccuracy = totalAnswered > 0
      ? Math.round((totalCorrect / totalAnswered) * 100)
      : 0;

    const avgRank = avgRankResult.rows[0].avg_rank
      ? parseFloat(avgRankResult.rows[0].avg_rank)
      : null;

    // Compute consecutive-day streak
    const playDates = streakResult.rows.map(r => r.play_date);
    let playStreak = 0;
    if (playDates.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const firstDate = new Date(playDates[0]);
      firstDate.setHours(0, 0, 0, 0);

      // Streak only counts if player played today or yesterday
      if (firstDate.getTime() === today.getTime() || firstDate.getTime() === yesterday.getTime()) {
        playStreak = 1;
        for (let i = 1; i < playDates.length; i++) {
          const prev = new Date(playDates[i - 1]);
          prev.setHours(0, 0, 0, 0);
          const curr = new Date(playDates[i]);
          curr.setHours(0, 0, 0, 0);
          const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            playStreak++;
          } else {
            break;
          }
        }
      }
    }

    sendSuccess(res, { totalGames, bestScore, overallAccuracy, winCount, avgRank, playStreak });
  } catch (error) {
    next(error);
  }
}

export async function getChartData(req, res, next) {
  try {
    const userId = req.user.user_id;
    const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 30));

    const chartQuery = `
      SELECT
        play_date,
        ROUND(100.0 * SUM(correct_answers) / NULLIF(SUM(total_answered), 0), 1) AS accuracy,
        MAX(correct_answers) AS best_score,
        COUNT(DISTINCT session_id) AS games_played
      FROM (
        SELECT
          DATE(gs.created_at) AS play_date,
          gs.id AS session_id,
          gp.id AS participant_id,
          COUNT(pa.id) FILTER (WHERE pa.is_correct) AS correct_answers,
          COUNT(pa.id) AS total_answered
        FROM game_participants gp
        JOIN game_sessions gs ON gp.game_session_id = gs.id
        LEFT JOIN participant_answers pa ON gp.id = pa.participant_id
        WHERE (gp.user_id = $1 OR (gp.user_id IS NULL AND gp.display_name = (SELECT username FROM users WHERE id = $1)))
          AND gs.status = 'completed'
          AND gs.created_at >= NOW() - INTERVAL '1 day' * $2
        GROUP BY DATE(gs.created_at), gs.id, gp.id
      ) per_participant
      GROUP BY play_date
      ORDER BY play_date ASC
    `;

    const result = await query(chartQuery, [userId, days]);

    const dataPoints = result.rows.map(row => ({
      date: row.play_date,
      accuracy: parseFloat(row.accuracy) || 0,
      bestScore: parseInt(row.best_score),
      gamesPlayed: parseInt(row.games_played),
    }));

    sendSuccess(res, dataPoints);
  } catch (error) {
    next(error);
  }
}

