# Guess The Number Game

A modern, interactive "Guess The Number" web-based game built with HTML, CSS, and JavaScript. 

## Features

- **Multiple Difficulty Levels**:
  - **Easy**: Guess a number between 1 and 50.
  - **Medium**: Guess a number between 1 and 100.
  - **Hard**: Guess a number between 1 and 200.
- **Hint System**: Get a helpful hint to narrow down your choices when you're stuck (limited hints available).
- **Attempt Tracking**: Keep track of your remaining guesses. The number of attempts you get scales with difficulty.
- **Score & High Score**: Try to guess the number in as few attempts as possible to get a higher score. Your best score is saved for future games!
- **Guess History**: A visual list of all your previous guesses in the current round, helping you make better decisions.
- **Engaging UI**: Beautiful UI with floating shapes, animations, and a confetti celebration when you win!
- **Keyboard Shortcuts**: Quickly jump to the input field by pressing `.`.

## How to Play

1. Open `gtg.html` in your web browser.
2. Select your desired difficulty.
3. Enter your guess in the input field and click **Check** (or press Enter).
4. The game will tell you if your guess is too high or too low.
5. Use hints if you get stuck.
6. Guess the number before you run out of attempts to win!

## Setup

No setup or installation required. This is a vanilla front-end web project. Simply open the `gtg.html` file in any modern web browser to play.

## Technologies Used

- **HTML5** for structure
- **CSS3** for styling, animations, and responsive design
- **Vanilla JavaScript** for game logic and DOM manipulation
- [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) for the victory effect
