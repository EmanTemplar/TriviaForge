/**
 * TriviaForge - Room Service
 *
 * Manages live game room state and operations.
 * Handles room creation, player management, and room lifecycle.
 */

import { env } from '../config/environment.js';

/**
 * RoomService - Singleton service for managing live game rooms
 */
class RoomService {
  constructor() {
    // In-memory storage for active rooms
    // { roomCode: { quizFilename, quizId, quizData, players, presenterId, currentQuestionIndex, presentedQuestions, revealedQuestions, kickedPlayers, status, createdAt } }
    this.liveRooms = {};
  }

  /**
   * Get all active rooms
   * @returns {Object} Live rooms object
   */
  getAllRooms() {
    return this.liveRooms;
  }

  /**
   * Get a specific room by code
   * @param {string} roomCode - Room code
   * @returns {Object|null} Room object or null if not found
   */
  getRoom(roomCode) {
    return this.liveRooms[roomCode] || null;
  }

  /**
   * Check if a room exists
   * @param {string} roomCode - Room code
   * @returns {boolean}
   */
  roomExists(roomCode) {
    return !!this.liveRooms[roomCode];
  }

  /**
   * Create a new room or update existing room's presenter
   * @param {string} roomCode - Room code
   * @param {string} socketId - Presenter socket ID
   * @param {Object} quiz - Quiz data from database
   * @param {string} quizFilename - Quiz filename (for backward compatibility)
   * @param {number} createdBy - Admin user ID who created the room
   * @returns {Object} Created/updated room object
   */
  createOrUpdateRoom(roomCode, socketId, quiz, quizFilename, createdBy = null) {
    // Convert database format to legacy format for compatibility
    const quizData = {
      filename: quizFilename,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        choices: q.choices.map((c) => c.text),
        correctChoice: q.choices.findIndex((c) => c.isCorrect),
      })),
    };

    // Check if room already exists (presenter reconnecting)
    if (this.liveRooms[roomCode]) {
      // Presenter is reconnecting - update presenter socket ID
      if (env.isVerboseLogging) {
        console.log(`✅ [ROOM SERVICE] Presenter reconnected to room ${roomCode}`);
      }
      this.liveRooms[roomCode].presenterId = socketId;
      return this.liveRooms[roomCode];
    }

    // Create new room
    this.liveRooms[roomCode] = {
      quizFilename,
      quizId: quiz.id,
      quizData,
      players: {},
      presenterId: socketId,
      currentQuestionIndex: null,
      presentedQuestions: [],
      revealedQuestions: [],
      kickedPlayers: {}, // { username: kickedTimestamp }
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      createdBy: createdBy || 1, // Admin user ID who created the room
    };

    console.log(`[ROOM SERVICE] Room ${roomCode} created for quiz ID ${quiz.id} (${quiz.title})`);
    return this.liveRooms[roomCode];
  }

  /**
   * Restore room from database session
   * @param {string} roomCode - Room code
   * @param {string} socketId - Presenter socket ID
   * @param {Object} sessionData - Session data from database
   * @returns {Object} Restored room object
   */
  restoreRoom(roomCode, socketId, sessionData) {
    const room = {
      quizFilename: `quiz_${sessionData.quiz_id}.json`,
      quizId: sessionData.quiz_id,
      quizData: sessionData.quizData,
      players: sessionData.players || {},
      presenterId: socketId,
      currentQuestionIndex: sessionData.currentQuestionIndex,
      presentedQuestions: sessionData.presentedQuestions || [],
      revealedQuestions: sessionData.revealedQuestions || [],
      kickedPlayers: {},
      status: sessionData.status || 'in_progress',
      createdAt: sessionData.createdAt,
      sessionId: sessionData.sessionId,
    };

    this.liveRooms[roomCode] = room;
    console.log(`[ROOM SERVICE] Room ${roomCode} restored from session ${sessionData.sessionId}`);
    return room;
  }

  /**
   * Add player to room
   * @param {string} roomCode - Room code
   * @param {string} username - Player username
   * @param {Object} playerData - Player data object
   * @returns {boolean} Success status
   */
  addPlayer(roomCode, username, playerData) {
    const room = this.liveRooms[roomCode];
    if (!room) return false;

    room.players[username] = playerData;
    if (env.isVerboseLogging) {
      console.log(`[ROOM SERVICE] Player ${username} added to room ${roomCode}`);
    }
    return true;
  }

  /**
   * Remove player from room
   * @param {string} roomCode - Room code
   * @param {string} username - Player username
   * @returns {boolean} Success status
   */
  removePlayer(roomCode, username) {
    const room = this.liveRooms[roomCode];
    if (!room || !room.players[username]) return false;

    delete room.players[username];
    if (env.isVerboseLogging) {
      console.log(`[ROOM SERVICE] Player ${username} removed from room ${roomCode}`);
    }
    return true;
  }

  /**
   * Get player from room
   * @param {string} roomCode - Room code
   * @param {string} username - Player username
   * @returns {Object|null} Player object or null
   */
  getPlayer(roomCode, username) {
    const room = this.liveRooms[roomCode];
    if (!room) return null;
    return room.players[username] || null;
  }

  /**
   * Get all players in room (excluding spectators)
   * @param {string} roomCode - Room code
   * @returns {Array} Array of player objects
   */
  getPlayers(roomCode) {
    const room = this.liveRooms[roomCode];
    if (!room) return [];
    return Object.values(room.players).filter((p) => !p.isSpectator);
  }

  /**
   * Update player socket ID (for reconnection)
   * @param {string} roomCode - Room code
   * @param {string} username - Player username
   * @param {string} socketId - New socket ID
   * @returns {boolean} Success status
   */
  updatePlayerSocket(roomCode, username, socketId) {
    const player = this.getPlayer(roomCode, username);
    if (!player) return false;

    player.socketId = socketId;
    return true;
  }

  /**
   * Kick player from room
   * @param {string} roomCode - Room code
   * @param {string} username - Player username
   * @returns {boolean} Success status
   */
  kickPlayer(roomCode, username) {
    const room = this.liveRooms[roomCode];
    if (!room) return false;

    // Add to kicked players list with timestamp
    room.kickedPlayers[username] = Date.now();

    // Remove from active players
    delete room.players[username];

    console.log(`[ROOM SERVICE] Player ${username} kicked from room ${roomCode}`);
    return true;
  }

  /**
   * Check if player is kicked (within cooldown period)
   * @param {string} roomCode - Room code
   * @param {string} username - Player username
   * @returns {boolean} True if player is kicked and in cooldown
   */
  isPlayerKicked(roomCode, username) {
    const room = this.liveRooms[roomCode];
    if (!room || !room.kickedPlayers[username]) return false;

    const kickTime = room.kickedPlayers[username];
    const KICK_COOLDOWN = 5000; // 5 seconds
    const timeSinceKick = Date.now() - kickTime;

    return timeSinceKick < KICK_COOLDOWN;
  }

  /**
   * Update current question index
   * @param {string} roomCode - Room code
   * @param {number} questionIndex - Question index
   * @returns {boolean} Success status
   */
  setCurrentQuestion(roomCode, questionIndex) {
    const room = this.liveRooms[roomCode];
    if (!room) return false;

    room.currentQuestionIndex = questionIndex;
    return true;
  }

  /**
   * Mark question as presented
   * @param {string} roomCode - Room code
   * @param {number} questionIndex - Question index
   * @returns {boolean} Success status
   */
  markQuestionPresented(roomCode, questionIndex) {
    const room = this.liveRooms[roomCode];
    if (!room) return false;

    if (!room.presentedQuestions.includes(questionIndex)) {
      room.presentedQuestions.push(questionIndex);
    }
    return true;
  }

  /**
   * Mark question as revealed
   * @param {string} roomCode - Room code
   * @param {number} questionIndex - Question index
   * @returns {boolean} Success status
   */
  markQuestionRevealed(roomCode, questionIndex) {
    const room = this.liveRooms[roomCode];
    if (!room) return false;

    if (!room.revealedQuestions.includes(questionIndex)) {
      room.revealedQuestions.push(questionIndex);
    }
    return true;
  }

  /**
   * Complete quiz in room
   * @param {string} roomCode - Room code
   * @returns {boolean} Success status
   */
  completeQuiz(roomCode) {
    const room = this.liveRooms[roomCode];
    if (!room) return false;

    room.status = 'completed';
    console.log(`[ROOM SERVICE] Quiz completed in room ${roomCode}`);
    return true;
  }

  /**
   * Delete room
   * @param {string} roomCode - Room code
   * @returns {boolean} Success status
   */
  deleteRoom(roomCode) {
    if (!this.liveRooms[roomCode]) return false;

    delete this.liveRooms[roomCode];
    console.log(`[ROOM SERVICE] Room ${roomCode} deleted`);
    return true;
  }

  /**
   * Get active rooms summary for client
   * @returns {Array} Array of active room summaries
   */
  getActiveRoomsSummary() {
    return Object.keys(this.liveRooms).map((roomCode) => {
      const room = this.liveRooms[roomCode];
      return {
        roomCode,
        quizTitle: room.quizData?.title || 'Unknown Quiz',
        playerCount: Object.values(room.players).filter((p) => !p.isSpectator).length,
        status: room.status,
        createdAt: room.createdAt,
      };
    });
  }

  /**
   * Get room count
   * @returns {number} Number of active rooms
   */
  getRoomCount() {
    return Object.keys(this.liveRooms).length;
  }
}

// Export singleton instance
export const roomService = new RoomService();
export default roomService;
