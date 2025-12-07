import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const SCHEMA_FILE = "envspec.json";

export function initCommand(options){
    const cwd = process.cwd();
    const schemaPath = path.join(cwd, SCHEMA_FILE);

    if(fs.existsSync(schemaPath)){
        console.log("❌ envspec.json already exists");
        return;
    }

    let schema = {
        $schemaVersion: 1
    }

    if(options.fromEnv){
        const envPath = path.join(cwd, ".env");

        if(!fs.existsSync(envPath)){
            console.log("❌ .env file not found");
            return;
        }

        const parsed = dotenv.config({path: envPath}).parsed;

        if(!parsed){
            console.log("❌ Failed to read .env file");
            return;
        }

        for(const [key, value] of Object.entries(parsed)){
            // console.log("value:", value, typeof value)
            if(value == null || value == undefined || value === "") {
                console.log(`❌ Invalid value found in .env: ${key}`);
                return;
            }
            schema[key] = inferSchema(value);
        }
    }


    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    console.log("✅ envspec initialized");
}

function inferSchema(value) {
  if (!isNaN(value)) {
    return { type: "number", required: false, example: Number(value) };
  }

  if (value === "true" || value === "false") {
    return {
      type: "boolean",
      required: false,
      example: value === "true",
    };
  }

  return {
    type: "string",
    required: false,
    example: "your_value_here",
  };
}