/**
 * TriviaForge - Export Service
 *
 * Generates CSV and PDF exports for session results
 */

/**
 * Generate CSV content from session data
 * @param {Object} sessionData - Full session data with questions and players
 * @returns {string} CSV content
 */
export function generateCSV(sessionData) {
  const lines = [];

  // Header section
  lines.push('TriviaForge Session Export');
  lines.push(`Quiz: ${escapeCSV(sessionData.quizTitle)}`);
  lines.push(`Room Code: ${sessionData.roomCode}`);
  lines.push(`Status: ${sessionData.status}`);
  lines.push(`Date: ${formatDate(sessionData.createdAt)}`);
  if (sessionData.completedAt) {
    lines.push(`Completed: ${formatDate(sessionData.completedAt)}`);
  }
  lines.push('');

  // Player Results section
  lines.push('PLAYER RESULTS');
  lines.push('Rank,Name,Correct,Answered,Accuracy');

  // Sort players by correct answers (descending), then by accuracy
  const sortedPlayers = [...sessionData.playerResults].sort((a, b) => {
    if (b.correct !== a.correct) return b.correct - a.correct;
    const accA = a.answered > 0 ? a.correct / a.answered : 0;
    const accB = b.answered > 0 ? b.correct / b.answered : 0;
    return accB - accA;
  });

  sortedPlayers.forEach((player, index) => {
    const accuracy = player.answered > 0
      ? Math.round((player.correct / player.answered) * 100)
      : 0;
    lines.push(
      `${index + 1},${escapeCSV(player.name)},${player.correct},${player.answered},${accuracy}%`
    );
  });

  lines.push('');

  // Question Breakdown section
  lines.push('QUESTION BREAKDOWN');
  lines.push('#,Question,Correct Answer,Correct Count,Incorrect Count,Unanswered');

  sessionData.questions.forEach((question, qIdx) => {
    // Count correct/incorrect answers for this question
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    sessionData.playerResults.forEach((player) => {
      const answer = player.answers[qIdx];
      if (answer === undefined) {
        unansweredCount++;
      } else if (answer === question.correctChoice) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    const correctLetter = String.fromCharCode(65 + question.correctChoice);
    const correctText = question.choices[question.correctChoice] || '';

    lines.push(
      `${qIdx + 1},${escapeCSV(question.text)},${correctLetter}. ${escapeCSV(correctText)},${correctCount},${incorrectCount},${unansweredCount}`
    );
  });

  return lines.join('\n');
}

/**
 * Generate simple text-based report (PDF placeholder until pdfkit is installed)
 * @param {Object} sessionData - Full session data
 * @returns {string} Formatted text report
 */
export function generateTextReport(sessionData) {
  const lines = [];
  const separator = '═'.repeat(60);
  const thinSep = '─'.repeat(60);

  lines.push(separator);
  lines.push('                    TRIVIAFORGE SESSION REPORT');
  lines.push(separator);
  lines.push('');
  lines.push(`  Quiz:        ${sessionData.quizTitle}`);
  lines.push(`  Room Code:   ${sessionData.roomCode}`);
  lines.push(`  Status:      ${sessionData.status}`);
  lines.push(`  Date:        ${formatDate(sessionData.createdAt)}`);
  if (sessionData.completedAt) {
    lines.push(`  Completed:   ${formatDate(sessionData.completedAt)}`);
  }
  lines.push(`  Players:     ${sessionData.playerResults.length}`);
  lines.push(`  Questions:   ${sessionData.presentedQuestions?.length || 0} / ${sessionData.questions.length}`);
  lines.push('');
  lines.push(thinSep);
  lines.push('                      PLAYER RANKINGS');
  lines.push(thinSep);
  lines.push('');

  // Sort players by correct answers
  const sortedPlayers = [...sessionData.playerResults].sort((a, b) => {
    if (b.correct !== a.correct) return b.correct - a.correct;
    const accA = a.answered > 0 ? a.correct / a.answered : 0;
    const accB = b.answered > 0 ? b.correct / b.answered : 0;
    return accB - accA;
  });

  const medals = ['🥇', '🥈', '🥉'];
  sortedPlayers.forEach((player, index) => {
    const accuracy = player.answered > 0
      ? Math.round((player.correct / player.answered) * 100)
      : 0;
    const medal = index < 3 ? medals[index] : '  ';
    const rank = String(index + 1).padStart(2, ' ');
    const name = player.name.padEnd(20, ' ').substring(0, 20);
    lines.push(`  ${medal} ${rank}. ${name}  ${player.correct}/${player.answered} correct (${accuracy}%)`);
  });

  lines.push('');
  lines.push(thinSep);
  lines.push('                    QUESTION BREAKDOWN');
  lines.push(thinSep);
  lines.push('');

  sessionData.questions.forEach((question, qIdx) => {
    let correctCount = 0;
    let incorrectCount = 0;

    sessionData.playerResults.forEach((player) => {
      const answer = player.answers[qIdx];
      if (answer === question.correctChoice) {
        correctCount++;
      } else if (answer !== undefined) {
        incorrectCount++;
      }
    });

    const total = correctCount + incorrectCount;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    lines.push(`  Q${qIdx + 1}: ${question.text.substring(0, 50)}${question.text.length > 50 ? '...' : ''}`);
    lines.push(`      Correct: ${correctCount}  |  Incorrect: ${incorrectCount}  |  Success Rate: ${percent}%`);
    lines.push('');
  });

  lines.push(separator);
  lines.push('              Generated by TriviaForge');
  lines.push(separator);

  return lines.join('\n');
}

/**
 * Escape special characters for CSV
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default {
  generateCSV,
  generateTextReport,
};
