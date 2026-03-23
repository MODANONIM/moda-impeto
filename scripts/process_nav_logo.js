const fs = require('fs');
const { PNG } = require('pngjs');

/**
 * Converts a white-background PNG into a transparent one.
 * More aggressive threshold and versioning.
 */
async function refineNavLogo() {
    const inputPath = '/Users/nonim/.gemini/antigravity/brain/8c624b46-7cb9-4ca9-bb44-ec552c294cbf/media__1774272082092.png';
    const outputPath = '/Users/nonim/Desktop/moda-impeto/assets/nav-logo.png';

    fs.createReadStream(inputPath)
        .pipe(new PNG())
        .on('parsed', function() {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const idx = (this.width * y + x) << 2;

                    // If pixel is near-white (average of RGB > 200), set alpha to 0
                    const avg = (this.data[idx] + this.data[idx+1] + this.data[idx+2]) / 3;
                    if (avg > 200) {
                        this.data[idx + 3] = 0;
                    }
                }
            }
            this.pack().pipe(fs.createWriteStream(outputPath))
                .on('finish', () => console.log('Successfully refined transparent nav logo.'));
        })
        .on('error', (err) => console.error('Error processing PNG:', err));
}

refineNavLogo();
