export const caseStudies = {
  'ai-coding-agents': {
    title: 'Make Coding Agents Easy to Use',
    subtitle: 'Replit.com',
    sections: [
      {
        id: 'context',
        title: 'Context',
        content: [
          {
            type: 'heading',
            value: 'Context'
          },
          {
            type: 'text',
            value: 'Transitioning from a chat-assisted IDE to an AI-driven app building experience...',
            italic: true
          },
          {
            type: 'text',
            value: 'With the advent of LLM coding models, Replit wanted to open up their product to anyone with a computer or phone, beyond the audience of professional developers.'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/on-call/slide01.png`,
            alt: 'From IDE to prompt driven experience',
            caption: 'From IDE to prompt driven experience'
          }
        ]
      },
      {
        id: 'problem',
        title: 'Problem',
        content: [
          {
            type: 'heading',
            value: 'Problem'
          },
          {
            type: 'text',
            value: 'When first introducing prompt-based coding, we noticed that the majority of users abandoned the project creation flow before achieving a barebones MVP app that worked.'
          },
          {
            type: 'text',
            value: 'Why were they abandoning the flow? '
          },
          {
            type: 'text',
            value: 'Most people are missing a few key pieces of knowledge that is needed to create products:'
          },
          {
            type: 'list',
            items: [
              'They don\'t know the steps involved in the product development lifecycle',
              'They don\'t know what these coding agents are capable of doing',
              'They don\'t know how to accurately define an MVP app for said coding agent to work on'
            ]
          }
        ]
      },
      {
        id: 'approach',
        title: 'Approach & Collaboration',
        content: [
          {
            type: 'heading',
            value: 'Approach & Collaboration'
          },
          {
            type: 'text',
            value: 'Working with the AI team, we developed three agents with their needed respective tools.'
          },
          {
            type: 'text',
            value: 'The Planner Agent would help a user define the app they wanted to build. The Product Manager Agent would then monitor plan progress, dole out tasks to the Coding Agent, and check with the user to confirm that features were working as intended. The Coding Agent generated code and set up dependencies and integrations.'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/on-call/slide02.png`,
            alt: 'Agent-guided app development plan',
            caption: 'Agent-guided app development plan'
          },
          {
            type: 'text',
            value: 'All of these agentic behaviors must progress in a way that makes sense to the user, and is constrained in the number of tokens spent for each step.'
          }
        ]
      },
      {
        id: 'solution',
        title: 'Solution',
        content: [
          {
            type: 'heading',
            value: 'Solution'
          },
          {
            type: 'text',
            value: 'Our goal was to get the user to a working version of their requested app as quickly as possible — in a single shot agent build.'
          },
          {
            type: 'text',
            value: 'The solution consisted of a simplified project creation flow that allows user to start with a simple text prompt and iteratively add features and technical requirements with help from the Planner Agent.'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/on-call/slide04.png`,
            alt: 'Reducing the knowledge barrier to building apps',
            caption: 'Reducing the knowledge barrier to building apps'
          },
          {
            type: 'text',
            value: 'Instead of overwhelming users with a dense, expert-level interface, they are now presented with a layout that centers their conversation with the agent alongside the live rendered output of their application build.'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/on-call/slide03.png`,
            alt: 'From prompt to working app',
            caption: 'Move the user from prompt to working app in a single step'
          }
        ]
      },
      {
        id: 'impact',
        title: 'Impact',
        content: [
          {
            type: 'heading',
            value: 'Impact'
          },
          {
            type: 'text',
            parts: [
              'I joined Replit after a round of layoffs, right at the moment they decided to pivot from a developer-targeted IDE to agentic coding for the masses. At that time, revenue was approximately $6M ARR.'
            ]
          },
          {
            type: 'text',
            parts: [
              'I was the only product designer working on the agentic project creation flow. After this product pivot and workflow redesign, new user dropoff in the app creation flow was reduced by a third. ARR quickly grew to $20M and is now at ', 
              { type: 'link', text: '$150M ARR a year later', url: 'https://www.cnbc.com/2025/12/04/google-replit-ai-vibe-coding-anthropic-cursor.html' },
              ', and there is still room for significant improvement.'
            ]
          }
        ]
      }
    ]
  },
  'app-performance': {
    title: 'Make the Mobile Apps Faster',
    subtitle: 'Facebook',
    sections: [
      {
        id: 'context',
        title: 'Context',
        content: [
          {
            type: 'heading',
            value: 'Context'
          },
          {
            type: 'text',
            value: 'At company all-hands, Zuckerberg announced that he was concerned about how long it took for our mobile apps to load. '
          },
          {
            type: 'text',
            value: 'With 10,000 engineers shipping code, the applications were becoming bloated and laggy.'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/status-pages/fb4a-cold-start.png`,
            alt: 'It takes 5 seconds for the Big Blue app to cold start on Android',
            caption: 'It takes 5 seconds for the Big Blue app to cold start on Android'
          }
        ]
      },
      {
        id: 'problem',
        title: 'Problem',
        content: [
          {
            type: 'heading',
            value: 'Problem'
          },
          {
            type: 'text',
            value: 'Everyone was adding features, but nobody was responsible for catching bugs and performance losses with respect to the hardware limitations (CPU & memory) of Android and iOS phones.'
          }
        ]
      },
      {
        id: 'approach',
        title: 'Approach',
        content: [
          {
            type: 'heading',
            value: 'Approach'
          },
          {
            type: 'text',
            value: 'Since no one at the company was handling this problem, we spun up an ad-hoc team to solve it. With a couple engineers and a product designer (myself), we set out to determine how the company was currently troubleshooting mobile app performance and build a tool to proactively take app quality and performance up to a higher level.'
          },
          {
            type: 'text',
            value: 'Facebook, Messenger, Instagram, WhatsApp... these apps need to boot up quickly and be responsive when a user tries any feature. Waiting 5 seconds for a screen to load is not acceptable. Using a half-dozen half-baked internal tools to put out fires was not working. '
          }, 
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/status-pages/design-process.png`,
            alt: 'High level design process',
            caption: 'High level design process'
          },
          {
            type: 'text',
            value: 'A handful of specialist engineers at the company knew how to do raw call stack tracing on the fleet of mobile apps. Call stack tracing tells us how many milliseconds of CPU time each function in the code is taking. When we see a function taking more time than it should, we manually (very painfully) track down the code change that caused the slowdown and fix it. '
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/status-pages/single-trace-flamegraph.png`,
            alt: 'A single call stack trace from one device',
            caption: 'A single call stack trace from one device -- not easy to see trends'
          }
        ]
      },
      {
        id: 'solution',
        title: 'Solution',
        content: [
          {
            type: 'heading',
            value: 'Solution'
          },
          {
            type: 'text',
            value: 'To do effective call stack analysis, trace logs from thousands of real world devices must be normalized and aggregated before a meaningful pattern emerges.  There was no tool in the world that could do this type of aggregate trace data comparison between two versions of an application. '
          },
          {
            type: 'text',
            value: 'We built a custom application that allowed a user to see granular performance (speed) changes between any two versions of a mobile application.  The work to prepare the data pipeline for this tool was not trivial. '
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/status-pages/trace-flow-01-lg.png`,
            alt: 'Its like a Google Maps explorer for your mobile app code',
            caption: 'Its like a Google Maps explorer for your mobile app code'
          }
        ]
      },
      {
        id: 'process',
        title: 'Design Artifacts',
        content: [
          {
            type: 'heading',
            value: 'Design Artifacts'
          },
          {
            type: 'text',
            value: 'Heres a look at the sequence of design artifacts from rough sketches to the final product. '
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/status-pages/design-01.png`,
            alt: 'Low fidelity prototypes',
            caption: '1: Low fidelity prototypes'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/status-pages/design-02.png`,
            alt: 'High fidelity prototype',
            caption: '2: High fidelity prototype'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/status-pages/design-05.png`,
            alt: 'Low fidelity prototypes',
            caption: '3: Tradeoffs between tables and graphs'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/status-pages/design-03.png`,
            alt: 'Low fidelity prototypes',
            caption: '4: First iteration call graph using Cytoscape.js'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/status-pages/design-04.png`,
            alt: 'High fidelity prototype',
            caption: '5: Second iteration call graph using Cytoscape.js'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/status-pages/design-06.png`,
            alt: 'High fidelity prototype',
            caption: '6: Final design -- a zooming and panning interactive graph with inspectors'
          }
        ]
      },
      {
        id: 'impact',
        title: 'Impact',
        content: [
          {
            type: 'heading',
            value: 'Impact'
          },
          {
            type: 'text',
            value: 'Now, an employee could easily pull up data from two mobile app versions and perform root cause analysis of a feature that got slow or stopped working. '
          },
          {
            type: 'text',
            value: 'A very powerful feature was the integration of code changes ("diffs") engineers had made that impacted function performance. We could now easily view within the tool who caused an issue and assign a task direclty to its source.  '
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/status-pages/diffs.png`,
            alt: 'View code changes affecting this function',
            caption: 'View code changes affecting this function'
          },
          {
            type: 'text',
            value: 'The time required to diagnose an issue was cut in half. Performance engineers could now diagnose small problems in two hours when it used to take a day. They could now diagnose large problems within one day when it had taken multiple days before.'
          },
          {
            type: 'text',
            value: 'All 10,000 product engineers were now empowered to take responsibility for reducing app bloat and improving speediness.'
          }
        ]
      }
    ]
  },
  'uber-freight': {
    title: 'Reduce Deadhead Miles for Truckers',
    subtitle: 'Uber Freight',
    sections: [
      {
        id: 'context',
        title: 'Context',
        content: [
          {
            type: 'heading',
            value: 'Context'
          },
          {
            type: 'text',
            value: 'Provide intelligent load bundling to get truckers back home',
            italic: true
          },
          {
            type: 'text',
            value: 'Truckers don\'t enjoy hauling air -- they don\'t get paid for that. Uber Freight has shipper contracts providing a large pool of loads. They wanted to help truckers get out on the road and back with minimal deadheading by providing multiple combinations of loads that could be booked with one click.'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/uber-freight/UF-spot-load-board.webp`,
            alt: 'Searching for the best loads to book can be hard',
            caption: 'Searching for the best loads to book can be hard'
          }
        ]
      },
      {
        id: 'problem',
        title: 'Problem',
        content: [
          {
            type: 'heading',
            value: 'Problem'
          },
          {
            type: 'text',
            value: 'For a driver booking their own loads, it\'s a challenge to identify the best combination of individual loads that will:'
          },
          {
            type: 'list',
            items: [
              'Match their equipment',
              'Maximize profit',
              'Minimize empty running',
              'Return them a target location (usually home)'
            ]
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/uber-freight/sort-loads-by-deadhead.JPEG`,
            alt: 'In this mobile view, loads are sorted by deadhead miles',
            caption: 'In this mobile view, loads are sorted by deadhead miles'
          }
        ]
      },
      {
        id: 'approach',
        title: 'Approach & Collaboration',
        content: [
          {
            type: 'heading',
            value: 'Approach & Collaboration'
          },
          {
            type: 'text',
            value: 'On the Marketplace team (which secures loads from shippers), I worked with the Carrier team to build a workflow that ingests and finalizes contract loads efficiently. Loads are then sent to an engine that generates combinations of loads based on multiple factors.'
          },
          {
            type: 'text',
            value: 'My process involved working with both our shipper pricing team and our carriers to understand points of friction and other important drivers of their decision making.'
          },
          {
            type: 'text',
            value: 'As we created the first version of the load bundling algorithm, we explored various approaches for presenting bundled loads to carriers in the web and mobile apps. '
          }
        ]
      },
      {
        id: 'solution',
        title: 'Solution',
        content: [
          {
            type: 'heading',
            value: 'Solution'
          },
          {
            type: 'text',
            value: 'It starts with contract generation. All requested lanes and volumes are submitted by the shipper. Our tool uses market data to automatically generate prices for each lane. Any lanes that need review are flagged for attention. '
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/uber-freight/freight-pricing-screenshot.png`,
            alt: 'Review automated lane pricing for contracts',
            caption: 'Review automated lane pricing for contracts'
          },
          {
            type: 'text',
            value: 'After a human reviews and finalizes lane prices, the contract goes live and loads are populated into the carrier app.'
          },
          {
            type: 'text',
            value: 'Loads are then combined to form bundles that are bookable in a single click.'
          },
          {
            type: 'text',
            value: 'These bundles could take a driver to multiple dropoff and pickup points for a complete roundtrip loop. Bundles are designed to minimize the distance between pickups and dropoffs, among other variables.'
          },
          {
            type: 'image',
            src: `${process.env.PUBLIC_URL}/images/case-studies/uber-freight/book-load-bundle.gif`,
            alt: 'Book a roundtrip bundle that returns to Fort Worth, TX',
            caption: 'Book a roundtrip bundle that returns to Fort Worth, TX'
          }
        ]
      },
      {
        id: 'impact',
        title: 'Impact',
        content: [
          {
            type: 'heading',
            value: 'Impact'
          },
          {
            type: 'text',
            parts: [
              'With this new feature, carriers were able to spend less time searching for and booking loads. It was easier for them to book loads that would bring them back home while also reducing deadhead losses. ', 
              { type: 'link', text: 'Read more about this work on uberfreight.com', url: 'https://www.uberfreight.com/en-US/blog/uber-freight-load-bundles' },
              '.'
            ]
          }
        ]
      }
    ]
  }
};

