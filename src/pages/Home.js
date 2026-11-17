import React from 'react';
import { Link } from 'react-router-dom';
import PrototypeDiagram from '../components/PrototypeDiagram';
import './Home.css';

function Home({ theme, toggleTheme }) {
  return (
    <div className="home">
      <div className="home-container">
        <header className="hero">
          <h1 className="hero-title">
            Get Thom
            <img
              src="./images/paul-blue-avatar-pfp.jpg"
              alt="."
              className="avatar-image hero-period"
            />
          </h1>
          <p className="hero-subtitle">Creative Technologist</p>
        </header>

        <section className="pitch-section">
          <h2>Product Design is changing rapidly</h2>
          <p>
            I have been providing rapid-prototyping in code for the past decade. Thanks to the latest coding
            models like Opus and Sol, we can now prototype about 20 times faster. ⚡
          </p>
          <p>
            In a matter of hours, we can generate new product concepts to test with users, built upon appropriate sample data. These are real examples... 
          </p>
          <PrototypeDiagram />
        </section>

        <section className="about-section">
          <h2>About</h2>
          <p>As a product designer and engineer, I have helped build web & mobile apps across many industries. 
            These products are powered by complex workflows, automations, and AI agents. 
            </p>
            <p>While these systems are complex, we strive to make the surfaces we touch simple... designed 
           to bring clarity —
            <em>What do I need to know right now? What should I do next?</em>
            </p>
          <p>
            I have worked on product teams at{' '}
            <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>, <a href="https://www.uber.com" target="_blank" rel="noopener noreferrer">Uber</a>, <a href="https://www.apple.com" target="_blank" rel="noopener noreferrer">Apple</a>, <a href="https://www.netflix.com" target="_blank" rel="noopener noreferrer">Netflix</a> and{' '}
            <a href="https://replit.com" target="_blank" rel="noopener noreferrer">Replit</a>.{' '} I've also helped <a href="https://waterinthewest.stanford.edu/" target="_blank" rel="noopener noreferrer">Stanford University</a> publish climate and water use research data.
          </p>
          <p>
            <Link to="/about" className="about-more">More →</Link>
          </p>
        </section>

        <section className="case-studies-section">
          <h2>Case studies</h2>
          <ul>
            <li>
              <Link to="/case-study/ai-coding-agents">Replit: Make Coding Agents Easy to Use</Link>
            </li>
            <li>
              <Link to="/case-study/uber-freight">Uber Freight: Reduce Deadhead Miles for Truckers</Link>
            </li>
            <li>
              <Link to="/case-study/app-performance">Facebook: Make the Mobile Apps Faster</Link>
            </li>
            <li className="case-studies-more">
              (More available upon request...)
            </li>
          </ul>
        </section>

        <section className="connect-section">
          <h2>Connect</h2>
          <ul>
            <li className="connect-primary">
              <a href="mailto:thomhvans@gmail.com" className="contact-button">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="contact-button-icon">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
                Send me a Message
              </a>
            </li>
            <li>
              <a href="https://www.linkedin.com/in/thom-van-6469a71a4/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </li>
          </ul>
        </section>

        <footer className="home-footer">
          <div className="footer-brand">
            <img src="./images/th-logo.png" alt="Thom" className="footer-logo" />
            <p>© 2026</p>
          </div>
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

