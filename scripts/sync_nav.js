const fs = require('fs');
const path = require('path');

const targetDir = '/Users/nonim/Desktop/moda-impeto';
const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.html'));

const oldNav = `<ul class="nav__links">
            <li><a href="index.html" class="nav__link">HOME</a></li>
            <li><a href="index.html#products" class="nav__link">COLLECTION</a></li>
            <li><a href="index.html#hero" class="nav__link">STORY</a></li>
            <li><a href="#footer" class="nav__link">CONTACT</a></li>
        </ul>`;

const newNav = `<ul class="nav__links">
            <li><a href="index.html" class="nav__link">HOME</a></li>
            <li><a href="index.html#products" class="nav__link">COLLECTION</a></li>
            <li><a href="index.html#story" class="nav__link">STORY</a></li>
        </ul>`;

// Regex version to handle potential whitespace variations
const navRegex = /<ul class="nav__links">[\s\S]*?<\/ul>/;

files.forEach(file => {
    if (file === 'index.html') return; // index.html is already mostly fixed, but we'll double check it manually or with a slightly different rule

    const filePath = path.join(targetDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (navRegex.test(content)) {
        content = content.replace(navRegex, newNav);
        fs.writeFileSync(filePath, content);
        console.log(`Updated navigation in ${file}`);
    } else {
        console.log(`Navigation pattern not found in ${file}`);
    }
});
