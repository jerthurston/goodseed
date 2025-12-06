
import { CheerioCrawler } from "crawlee";
async function main() {
    console.log("🔍 Inspecting Seed vamcpiverseedbank Navigation");
    console.log("=".repeat(60));

    const crawler = new CheerioCrawler({
        async requestHandler({ $, log }) {
            log.info("Analyzing page structure...\n");

        }
    })
}