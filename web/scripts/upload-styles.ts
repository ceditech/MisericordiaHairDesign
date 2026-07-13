import { config } from "dotenv";
import { resolve, join } from "path";
import * as fs from "fs";

// Load env from .env.local BEFORE importing firebase admin
config({ path: resolve(process.cwd(), ".env.local") });

import { adminStorage } from "../src/lib/firebase/admin";

async function uploadFileToStorage(localPath: string, destinationPath: string): Promise<string> {
    const bucket = adminStorage.bucket();
    console.log(`Uploading ${localPath} to gs://${bucket.name}/${destinationPath}...`);
    
    const [file] = await bucket.upload(localPath, {
        destination: destinationPath,
        public: true,
        metadata: {
            cacheControl: 'public, max-age=31536000',
        }
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
    console.log(`Successfully uploaded! Public URL: ${publicUrl}`);
    return publicUrl;
}

async function main() {
    console.log("Starting style and hero image uploads...");

    const stylesDir = resolve(process.cwd(), "../static-template/StylesToUse");
    if (!fs.existsSync(stylesDir)) {
        console.error(`Error: Styles directory not found at ${stylesDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(stylesDir);
    console.log(`Found ${files.length} files in ${stylesDir}:`, files);

    const urlMappings: Record<string, string> = {};

    for (const file of files) {
        const localPath = join(stylesDir, file);
        const isHero = file === "Hero-Section-Braids.png";
        const destinationFolder = isHero ? "hero" : "styles";
        const destinationPath = `${destinationFolder}/${file}`;

        try {
            const publicUrl = await uploadFileToStorage(localPath, destinationPath);
            urlMappings[file] = publicUrl;
        } catch (err: any) {
            console.error(`Failed to upload ${file}:`, err.message);
        }
    }

    console.log("\n=== Upload Mappings ===");
    console.log(JSON.stringify(urlMappings, null, 2));
    console.log("=======================\n");
}

main().catch(console.error);
