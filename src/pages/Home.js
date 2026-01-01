import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home({ theme, toggleTheme }) {
  return (
    <div className="home">
      <div className="home-container">
        <div className="profile-section">
          <div className="avatar">
            <img 
              src="./images/paul-blue-avatar-pfp.jpg" 
              alt="Paul Van Slembrouck" 
              className="avatar-image"
            />
            {/* SVG logo - commented out for potential future use
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="20" fill="currentColor" opacity="0.1"/>
              <circle cx="20" cy="16" r="6" fill="currentColor" opacity="0.6"/>
              <path d="M8 32c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="currentColor" opacity="0.6"/>
            </svg>
            */}
          </div>
          <h2 className="name">Paul Thom Van Slembrouck</h2>
          <p className="title">
            Product designer, with front end experience
          </p>
        </div>

        <section className="about-section">
          <h2>About</h2>
          <p>I have experience in automated and AI / ML workflows, enterprise systems, and data visualization.</p>
          <p>
            I have worked on product teams at{' '}
            <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>, <a href="https://www.uber.com" target="_blank" rel="noopener noreferrer">Uber</a>, <a href="https://www.apple.com" target="_blank" rel="noopener noreferrer">Apple</a> and{' '}
            <a href="https://replit.com" target="_blank" rel="noopener noreferrer">Replit</a>.{' '} I've also helped <a href="https://waterinthewest.stanford.edu/" target="_blank" rel="noopener noreferrer">Stanford University</a> publish climate and water use research data.
          </p>
        </section>

        <section className="case-studies-section">
          <h2>Case studies</h2>
          <ul>
            <li>
              <Link to="/case-study/ai-coding-agents">Replit: Make Coding Agents Easy to Use</Link>
            </li>
            <li>
              <Link to="/case-study/app-performance">Facebook: Make the Mobile Apps Faster</Link>
            </li>
          </ul>
        </section>

        <section className="connect-section">
          <h2>Connect</h2>
          <ul>
            <li>
              <a href="https://github.com/ptvans" target="_blank" rel="noopener noreferrer">Github</a>
            </li>
            <li>
              <a href="https://www.linkedin.com/in/paul-thom-van-slembrouck-6469a71a4/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </li>
            <li>
              <a href="mailto:ptvans@gmail.com">Email</a>
            </li>
          </ul>
        </section>

        <footer className="home-footer">
          <p>© 2025</p>
          <div className="theme-toggle">
            <button
              className={theme === 'light' ? '' : 'inactive'}
              onClick={toggleTheme}
            >
              Light
            </button>
            <button
              className={theme === 'dark' ? '' : 'inactive'}
              onClick={toggleTheme}
            >
              Dark
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Home;

