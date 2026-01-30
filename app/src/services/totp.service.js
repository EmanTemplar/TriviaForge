/**
 * TriviaForge - TOTP Service
 *
 * Handles Two-Factor Authentication using TOTP (Time-based One-Time Password)
 * - Generate secrets for authenticator apps
 * - Generate QR codes for easy setup
 * - Verify TOTP codes
 * - Generate and verify backup codes
 */

import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const ISSUER = 'TriviaForge';
const ALGORITHM = 'SHA1';
const DIGITS = 6;
const PERIOD = 30; // seconds
const BACKUP_CODE_COUNT = 10;

/**
 * Generate a new TOTP secret for a user
 * @param {string} username - Username for the TOTP label
 * @returns {Object} Object containing secret (base32) and otpauth URI
 */
export function generateSecret(username) {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: username,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

/**
 * Generate a QR code data URL from an otpauth URI
 * @param {string} uri - The otpauth URI
 * @returns {Promise<string>} Base64 data URL of the QR code
 */
export async function generateQRCode(uri) {
  try {
    return await QRCode.toDataURL(uri, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify a TOTP token against a secret
 * @param {string} secret - Base32 encoded secret
 * @param {string} token - 6-digit TOTP token to verify
 * @returns {boolean} True if token is valid
 */
export function verifyToken(secret, token) {
  if (!secret || !token) return false;

  // Remove spaces and ensure token is a string
  const cleanToken = String(token).replace(/\s/g, '');

  // Validate token format (6 digits)
  if (!/^\d{6}$/.test(cleanToken)) return false;

  try {
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      algorithm: ALGORITHM,
      digits: DIGITS,
      period: PERIOD,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Allow for 1 period window (30 seconds before and after)
    const delta = totp.validate({ token: cleanToken, window: 1 });
    return delta !== null;
  } catch (err) {
    console.error('Error verifying TOTP:', err);
    return false;
  }
}

/**
 * Generate a set of backup codes
 * @param {number} count - Number of backup codes to generate (default: 10)
 * @returns {string[]} Array of backup codes (8 characters each, uppercase hex)
 */
export function generateBackupCodes(count = BACKUP_CODE_COUNT) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate 4 random bytes = 8 hex characters
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash backup codes for secure storage
 * @param {string[]} codes - Array of plaintext backup codes
 * @returns {Promise<string[]>} Array of hashed backup codes
 */
export async function hashBackupCodes(codes) {
  const saltRounds = 10;
  const hashedCodes = await Promise.all(
    codes.map((code) => bcrypt.hash(code, saltRounds))
  );
  return hashedCodes;
}

/**
 * Verify a backup code against stored hashed codes
 * @param {string} code - Plaintext backup code to verify
 * @param {string[]} hashedCodes - Array of hashed backup codes
 * @returns {Promise<number>} Index of matching code, or -1 if not found
 */
export async function verifyBackupCode(code, hashedCodes) {
  if (!code || !hashedCodes || !Array.isArray(hashedCodes)) return -1;

  // Normalize code: uppercase, remove spaces/dashes
  const cleanCode = String(code).toUpperCase().replace(/[\s-]/g, '');

  for (let i = 0; i < hashedCodes.length; i++) {
    try {
      const match = await bcrypt.compare(cleanCode, hashedCodes[i]);
      if (match) return i;
    } catch {
      // Continue checking other codes
    }
  }
  return -1;
}

/**
 * Format backup codes for display (with dashes for readability)
 * @param {string[]} codes - Array of backup codes
 * @returns {string[]} Array of formatted backup codes (e.g., "ABCD-EFGH")
 */
export function formatBackupCodes(codes) {
  return codes.map((code) => {
    const clean = code.replace(/[\s-]/g, '').toUpperCase();
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  });
}

export default {
  generateSecret,
  generateQRCode,
  verifyToken,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  formatBackupCodes,
};
