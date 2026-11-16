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
            models like Opus and Sol, we can now prototype 20 times faster. ⚡
          </p>
          <p>
            In a few hours, we can generate multiple new product concepts to test with users, based
            on the appropriate sample data.
          </p>
          <PrototypeDiagram />
        </section>

        <section className="about-section">
          <h2>About</h2>
          <p>As a product designer and engineer, I have experience building web and mobile apps across many industries. 
            These experiences are powered by complex workflows, automation, and AI agents that make things simple and easy to digest. 
            </p>
          <p>
            I have worked on product teams at{' '}
            <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>, <a href="https://www.uber.com" target="_blank" rel="noopener noreferrer">Uber</a>, <a href="https://www.apple.com" target="_blank" rel="noopener noreferrer">Apple</a>, <a href="https://www.netflix.com" target="_blank" rel="noopener noreferrer">Netflix</a> and{' '}
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
              <Link to="/case-study/uber-freight">Uber Freight: Reduce Deadhead Miles for Truckers</Link>
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
              <a href="https://www.linkedin.com/in/thom-van-slembrouck-6469a71a4/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
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

