import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home({ theme, toggleTheme }) {
  return (
    <div className="home">
      <div className="home-container">
        <div className="profile-section">
          <div className="avatar">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="20" fill="currentColor" opacity="0.1"/>
              <circle cx="20" cy="16" r="6" fill="currentColor" opacity="0.6"/>
              <path d="M8 32c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="currentColor" opacity="0.6"/>
            </svg>
          </div>
          <h1 className="name">Sam Willis</h1>
          <p className="title">
            Product designer at <a href="https://incident.io" target="_blank" rel="noopener noreferrer">incident.io</a>
          </p>
        </div>

        <section className="about-section">
          <h2>About</h2>
          <p>I specialise in clear, considered interfaces for complex products.</p>
          <p>
            I currently lead design at <a href="https://incident.io" target="_blank" rel="noopener noreferrer">incident.io</a> and previously worked on
            product teams at <a href="https://gocardless.com" target="_blank" rel="noopener noreferrer">GoCardless</a> and{' '}
            <a href="https://duffel.com" target="_blank" rel="noopener noreferrer">Duffel</a>.
          </p>
        </section>

        <section className="case-studies-section">
          <h2>Case studies</h2>
          <ul>
            <li>
              <Link to="/case-study/status-pages">Status pages redesign</Link>
            </li>
            <li>
              <Link to="/case-study/on-call">Reimagining on-call software</Link>
            </li>
          </ul>
        </section>

        <section className="connect-section">
          <h2>Connect</h2>
          <ul>
            <li>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a>
            </li>
            <li>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </li>
            <li>
              <a href="mailto:hello@example.com">Email</a>
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

