import readline from "readline";

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
