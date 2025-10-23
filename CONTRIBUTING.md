# Contributing to SSMS

Thank you for considering contributing to the School Scheduling Management System! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Keep discussions professional

## 🚀 Getting Started

### Prerequisites

- Python 3.13+
- Node.js 18+
- Git
- Code editor (VS Code recommended)

### Setting Up Development Environment

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SSMS
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # macOS/Linux
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Create Environment Files**
   
   Backend `.env`:
   ```
   SECRET_KEY=your-secret-key-here
   DATABASE_URL=sqlite:///ssms_database.db
   ```

5. **Start Development Servers**
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm start
   ```

## 🔄 Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Critical fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Message Format

Use conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add password history validation

fix(schedule): resolve timezone display issue

docs(readme): update installation instructions
```

## 💻 Code Standards

### Python (Backend)

**Style Guide:**
- Follow PEP 8
- Use type hints
- Maximum line length: 100 characters
- Use meaningful variable names

**Example:**
```python
from typing import List, Optional
from pydantic import BaseModel, field_validator

class User(BaseModel):
    """User model with validation."""
    
    id: str
    username: str
    role: str
    password_history: List[str] = []
    
    @field_validator('password_history', mode='before')
    @classmethod
    def parse_password_history(cls, v: str | List) -> List[str]:
        """Parse password_history from JSON string if needed."""
        if isinstance(v, str):
            return json.loads(v) if v else []
        return v or []
```

**Documentation:**
- Add docstrings to all functions/classes
- Use Google-style docstrings
- Document parameters and return values

### JavaScript/React (Frontend)

**Style Guide:**
- Use ES6+ features
- Prefer functional components with hooks
- Use destructuring
- Keep components small and focused

**Example:**
```javascript
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

/**
 * User profile component
 * @param {Object} props - Component props
 * @param {string} props.userId - User ID to display
 */
const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      setUser(response.data);
    } catch (error) {
      toast.error('Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  
  return <div>{user.name}</div>;
};

export default UserProfile;
```

### File Organization

**Backend Structure:**
```
backend/
├── server.py           # Main FastAPI app
├── models.py          # Database models (if separate)
├── auth.py            # Authentication utilities
├── database.py        # Database connection
├── utils.py           # Helper functions
└── tests/             # Unit tests
```

**Frontend Structure:**
```
frontend/src/
├── components/        # Reusable components
│   └── ui/           # Shadcn UI components
├── pages/            # Page components
├── hooks/            # Custom React hooks
├── lib/              # Utilities
└── config/           # Configuration
```

## 📝 Submitting Changes

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests if applicable
   - Update documentation

3. **Test your changes**
   ```bash
   # Backend tests
   cd backend
   pytest

   # Frontend tests
   cd frontend
   npm test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): your message"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Provide clear description
   - Reference related issues
   - Include screenshots for UI changes

### Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] UI changes tested on mobile

## 🐛 Reporting Issues

### Bug Reports

Include:
- **Description**: Clear description of the bug
- **Steps to Reproduce**: Detailed steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Environment**: OS, browser, versions

**Template:**
```markdown
## Bug Description
Brief description of the issue

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Screenshots
If applicable

## Environment
- OS: Windows 11
- Browser: Chrome 120
- Backend Version: 2.0.0
```

### Feature Requests

Include:
- **Problem**: What problem does this solve?
- **Solution**: Describe your proposed solution
- **Alternatives**: Alternative solutions considered
- **Context**: Additional context

## 🔧 Development Tips

### Common Tasks

**Add a new API endpoint:**
```python
@app.post("/api/endpoint")
async def new_endpoint(data: RequestModel):
    """Endpoint description."""
    # Implementation
    return {"message": "Success"}
```

**Add a new React component:**
```javascript
// components/NewComponent.js
import React from 'react';

const NewComponent = ({ prop }) => {
  return <div>{prop}</div>;
};

export default NewComponent;
```

**Database migration:**
```python
# Add column
cursor.execute("ALTER TABLE users ADD COLUMN new_field TEXT")
```

### Debugging

**Backend:**
- Check console logs
- Use Python debugger: `import pdb; pdb.set_trace()`
- Review FastAPI docs at http://localhost:8000/docs

**Frontend:**
- React DevTools browser extension
- Console.log strategically
- Network tab for API issues

### Testing

**Backend tests:**
```python
import pytest
from fastapi.testclient import TestClient

def test_endpoint():
    response = client.get("/api/endpoint")
    assert response.status_code == 200
```

**Frontend tests:**
```javascript
import { render, screen } from '@testing-library/react';

test('renders component', () => {
  render(<Component />);
  expect(screen.getByText('Text')).toBeInTheDocument();
});
```

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Shadcn/UI Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

## ❓ Questions?

If you have questions:
- Check existing documentation
- Search closed issues
- Open a new discussion
- Contact maintainers

---

Thank you for contributing to SSMS! 🎉
