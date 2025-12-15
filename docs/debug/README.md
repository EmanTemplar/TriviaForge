# TriviaForge Debug System Documentation

**Version:** 1.0.1
**Last Updated:** December 14, 2025
**Status:** Development Tool Only

---

## 📰 Recent Updates

### v1.0.1 (2025-12-14)
- **Enhanced Test Cleanup:** Automated test suite now automatically deletes rooms, sessions, and test users
- **Detailed Statistics:** Cleanup operations display counts for rooms, sessions, and users deleted
- **No Manual Cleanup:** Tests clean up completely - no admin intervention needed

---

## ⚠️ Important Security Notice

**DO NOT ENABLE DEBUG MODE IN PRODUCTION!**

The debug system provides unrestricted access to system internals. This is intended for development and testing only.

---

## 📚 Documentation Index

### Getting Started
- **[Quick Start Guide](quickstart.md)** - Get up and running in 30 seconds
  - Enable debug mode
  - Run your first test
  - Choose between CLI or Web interface

### Core Documentation
- **[API Reference](api-reference.md)** - Complete debug API documentation
  - All debug endpoints
  - Request/response formats
  - Testing workflows
  - cURL and JavaScript examples

- **[CLI Tools](cli-tools.md)** - Console-based debugging
  - Command reference
  - Quick workflows
  - Integration with CI/CD
  - Scripting examples

- **[User Management Tools](user-management.md)** - User and password debugging
  - User account inspection
  - Password reset utilities
  - Session management
  - Common scenarios

### Additional Resources
- **[Historical Fixes](archive/fixes-2025-12-06.md)** - Debug system fixes from December 6, 2025
  - Route ordering fixes
  - CLI tool implementation
  - Troubleshooting guide

---

## 🚀 Quick Reference

### Enable Debug Mode

Add to your `.env` file:
```env
NODE_ENV=development
```

Then restart:
```bash
docker-compose restart
```

### Most Common Commands

```bash
# System status check
npm run debug:status

# Run automated test
npm run debug:test

# List all users
npm run debug users

# Web interface
http://localhost:3000/debug
```

---

## 🎯 Choose Your Interface

### Console (CLI)
**Best for:** Quick checks, automation, scripting, CI/CD

```bash
cd app
npm run debug:status
```

See: [CLI Tools Documentation](cli-tools.md)

### Web Interface
**Best for:** Visual inspection, detailed exploration

Open browser: `http://localhost:3000/debug`

See: [API Reference Documentation](api-reference.md)

---

## 📖 Documentation Structure

```
docs/debug/
├── README.md              # This file - Overview and navigation
├── quickstart.md          # Fast track to get started
├── api-reference.md       # Complete API documentation
├── cli-tools.md           # Console tool reference
├── user-management.md     # User debugging utilities
└── archive/
    └── fixes-2025-12-06.md  # Historical fixes
```

---

## 🔒 Security Reminders

- ⚠️ Only enable debug mode in development environments
- ⚠️ Never expose debug endpoints to public internet
- ⚠️ Clean up test data before deploying to production
- ⚠️ Set `NODE_ENV=production` before deployment

---

## 🆘 Need Help?

1. Start with [Quick Start Guide](quickstart.md)
2. Check [API Reference](api-reference.md) for detailed documentation
3. Review console logs for error messages
4. Verify debug mode is enabled
5. Try restarting the server

---

## Related Documentation

- [../README.md](../../README.md) - Main project documentation
- [../TODO.md](../../TODO.md) - Feature roadmap
- [../DEV-SUMMARY.md](../../DEV-SUMMARY.md) - Developer onboarding (internal)
- [../CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines

---

**Happy Debugging! 🐛**
