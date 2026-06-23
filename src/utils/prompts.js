import readline from "readline";

/**
 * Prompts the user for a yes/no confirmation
 * @param {string} message - The confirmation message to display
 * @returns {Promise<boolean>} Promise that resolves to true if user confirms, false otherwise
 */
export function confirm(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(
        answer.trim().toLowerCase() === "yes" ||
          answer.trim().toLowerCase() === "y"
      );
    });
  });
}

/**
 * Prompts the user for text input
 * @param {string} message - The prompt message
 * @param {string} [defaultValue] - Default value if user presses enter
 * @returns {Promise<string>} Promise that resolves to the user's input
 */
export function input(message, defaultValue = "") {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = defaultValue 
      ? `${message} (${defaultValue}): `
      : `${message}: `;

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Prompts the user to select from a list of options
 * @param {string} message - The prompt message
 * @param {Array<string>} choices - Array of choices
 * @param {string} [defaultChoice] - Default choice
 * @returns {Promise<string>} Promise that resolves to the selected choice
 */
export function select(message, choices, defaultChoice) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(`\n${message}`);
    choices.forEach((choice, index) => {
      const marker = choice === defaultChoice ? " (default)" : "";
      console.log(`  ${index + 1}. ${choice}${marker}`);
    });

    const prompt = defaultChoice 
      ? `\nSelect (1-${choices.length}) [${choices.indexOf(defaultChoice) + 1}]: `
      : `\nSelect (1-${choices.length}): `;

    rl.question(prompt, (answer) => {
      rl.close();
      
      if (!answer.trim() && defaultChoice) {
        resolve(defaultChoice);
        return;
      }

      const index = parseInt(answer.trim()) - 1;
      if (index >= 0 && index < choices.length) {
        resolve(choices[index]);
      } else {
        console.log("Invalid selection. Please try again.");
        resolve(select(message, choices, defaultChoice));
      }
    });
  });
}
