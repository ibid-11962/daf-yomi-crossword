getTodaysDaf = async () => {
    const response = await fetch("https://www.sefaria.org/api/calendars");
    const data = await response.json();
    const ref = data.calendar_items.find(cal=>cal.title.en==="Daf Yomi").ref;
    await getClues(ref);
};

getClues = async (ref) => {
    const response = await fetch(`https://www.sefaria.org/api/texts/${ref}`);
    const data = await response.json();
    document.getElementById("clues").innerHTML="";
    if (data.error)
        document.getElementById("dafname").innerText=data.error;
    else
        document.getElementById("dafname").innerText=ref;
    const hes = data.isSpanning ? data.he : [data.he];
    const refs = data.isSpanning ? data.spanningRefs : [ref]

    //code is equivalent to asynchronous flatmap, based on https://gist.github.com/Yopadd/d1381e0fdc1aa6bedaeb36b7a8381892
    let clues = [].concat(...await Promise.all(hes.map(async (he,i)=>
        [...await getLinkClues(he,refs[i]),...getContextClues(he)]
    )))
    displayClues(clues);
};

getLinkClues = async (he,ref) => {
    const response = await fetch(`https://www.sefaria.org/api/links/${ref}`);
    const data = await response.json();
    let clues = data.filter(link=>link.category==="Commentary"&&link.anchorVerse).flatMap(link=>{
        if (!link.he || !link.he.length || link.anchorRefExpanded.length>1 || Array.isArray(link.he)) return [];
        // heList = removeNikkudos(link.he).split(/[^\u05D0-\u05ED ]/).filter(str=>str.length);
        heList = removeNikkudos(link.he).split(/[.b\-<>\/:]/).filter(str=>str.length);
        index = heList.findIndex(str=>
            str.length > 3 && str.length < 20 && removeAllNikkudos(he[link.anchorVerse - 1]).includes(str.trim()));
        if (index === -1 || index > 3)
            return [];
        else
            return [{
                idx:index,
                index_title:link.index_title,
                answer: heList[index].trim(),
                clue: heList.slice(index+1).join("").trim(),
                full: link.he,
                collectiveTitle:link.collectiveTitle.en,
            }];
    });
    clues = clues.filter(clue=>["Rashi","Tosafot"].includes(clue.collectiveTitle));
    return clues;
};

getContextClues = (he)=>{
    return he.flatMap(line=>{
        const words = removeAllNikkudos(line).split(" ");
        const idx = Math.floor(Math.random() * Math.floor(words.length-6))+3;
        const answer = words.splice(idx,1,"_______");
        if (words.length<7 || answer[0].length<2)
            return [];
        else
            return [{
                idx:idx,
                answer: answer[0],
                clue: words.slice(idx-3,idx+4).join(" "),
                words:words,
                collectiveTitle:"Fill in the blank",
            }];
    })
};

displayClues = (clues) => {
/*
    clues.forEach(clue=>{
        node = document.createElement("li");
        cluetext = document.createElement("p");
        cluetext.innerText = `${clue.collectiveTitle}: ${clue.clue.match(/.{1,100}(\s|$)/g)[0]}`;
        answertext = document.createElement("span");
        answertext.innerText = clue.answer;
        answertext.className = "spoiler";
        node.appendChild(cluetext);
        node.appendChild(answertext);
        document.getElementById("clues").appendChild(node)
    });
    console.log(clues);
*/
    let mainloop = 0;
    while (mainloop++<30) {
        words = clues.map(clue => ({
            crossword: standardizeLetters(clue.answer),
            prefix: `${clue.collectiveTitle}(${removeAllNikkudos(clue.answer).split(" ").map(word => word.length).join(" ")}): `,
            clue: clue.clue,
            answer: removeAllNikkudos(clue.answer)
        }));
        words = words.sort(() => .5 - Math.random()).slice(0,15);
        words.sort((a, b) => a.crossword.length - b.crossword.length);
        let crosswordtries = 0;
        while (crosswordtries++<1000) {
            let status = generate();
            if (status==="success") {
                console.log("success");
                return 0;
            }
        }
        console.log(mainloop)
    }
};

removeNikkudos = str => str.replace(/[\u0591-\u05C7]/g, ''); //removes anything in the nikkudas unicode range
removeAllNikkudos = str => str.replace(/[^\u05D0-\u05ED ]/g, ''); //removes anything not in the reg hebrew range or space

getTodaysDaf();
document.getElementById('refinput').addEventListener('keydown', function onEvent(event) {
    if (event.key === "Enter") {
        getClues(this.value);
        return false;
    }
});

standardizeLetters = (answer) => {
    answer = answer.replace(/[^\u05D0-\u05ED]/g, ''); //removes anything not in the reg hebrew range (e.g nikkudos, punctuation, spaces)
    return ([...answer].map(char => {
        let charCode = char.charCodeAt(0);
        if ("םךןףץ".includes(char))
            charCode++; //increment any end letters to regular letters
        return String.fromCharCode(charCode)
    })).join("");
};

// Crossword generation algorithm based on https://github.com/nknickrehm/crossword

const SIZE = 100;
const grid = new Array(SIZE);
let words = [];
let unplacableWords = [];

function displayCrossword(placedWords) {
    document.querySelector('#cross').innerHTML = '';

    document.querySelector('#cross').insertAdjacentHTML('beforeend', `
      <nav id="nav">
<!--        <input type="button" value="Generate" onclick="generate()">-->
        <input type="button" value="Show / Hide answers" onclick="toggleAnswers()">
        <input type="button" value="Toggle printer friendly colors" onclick="toggleColor()">
        <input type="button" value="Print" onclick="window.print()">
      </nav>
    `);

    document.querySelector('#cross').insertAdjacentHTML('beforeend', `<div id="grid" class="hidden-answers">`);
    document.querySelector('#cross').insertAdjacentHTML('beforeend', `<div id="clues2">`);
    const gridDOM = document.querySelector('#grid');
    const cluesDOM = document.querySelector('#clues2');

    let minX = SIZE;
    let minY = SIZE;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (grid[y][x]) minX = Math.min(minX, x);
            if (grid[y][x]) minY = Math.min(minY, y);
            if (grid[y][x]) maxX = Math.max(maxX, x);
            if (grid[y][x]) maxY = Math.max(maxY, y);

            grid[y][x] = grid[y][x] || '&nbsp;';
        }
    }

    maxY++;

    const diffX = maxX - minX;
    const diffY = maxY - minY;

    const optimizedGrid = new Array(diffY);

    for (let y = 0; y < diffY; y++) {
        optimizedGrid[y] = grid[minY + y].slice(minX, maxX + 1);
    }

    let cluelistA = [];
    let cluelistD = [];
    let clueCounter = 1;

    optimizedGrid.forEach((line,x) => {
        let output = '';
        line.forEach((item,y) => {
            if (item[0] === '#') {
                let thisnum = clueCounter;
                if (x && y+2 < optimizedGrid[0].length && optimizedGrid[x-1][y+1][0]==="@") {
                    thisnum = optimizedGrid[x-1][y+1].slice(1);
                    console.log(thisnum)
                }
                else
                    clueCounter++;
                let word = placedWords[Number(item.slice(2))];
                if (item[1] === 'a') {
                    cluelistA.push({num: thisnum, answer: word.answer, clue: word.clue, prefix: word.prefix})
                } else {
                    cluelistD.push({num: thisnum, answer: word.answer, clue: word.clue, prefix: word.prefix})
                }
                optimizedGrid[x][y]="@"+(clueCounter-1);
                output = `<div class="cell hint">${thisnum}</div>${output}`;
            } else if (item === '&nbsp;')
                output = `<div class="cell empty">&nbsp;</div>${output}`;
            else
                output = `<div class="cell full">${item}</div>${output}`;
        });
        gridDOM.insertAdjacentHTML('beforeend', `<div class="row">${output}</div>`);
    });
    let output = "<h3>Across</h3>";
    cluelistA.forEach(clue => {
        output += `<p>${clue.num}: ${clue.prefix}<span class="heb">${clue.clue}</span></p>`
    });
    output += "<h3>Down</h3>";
    cluelistD.forEach(clue => {
        output += `<p>${clue.num}: ${clue.prefix}<span class="heb">${clue.clue}</span></p>`
    });
    cluesDOM.insertAdjacentHTML('beforeend', output);
}

function generate() {
    // Sort the words by length
    //const words_sorted_by_length = words.sort((a, b) => a.length < b.length ? 1 : (a.length > b.length ? -1 : 0));
    const words_sorted_by_length = words.slice();

    for (let i = 0; i < SIZE; i++) grid[i] = new Array(SIZE);

    let word = words_sorted_by_length[0];
    // Place the first word
    const x = Math.floor(SIZE / 2 - word.crossword.length / 2);
    const y = Math.floor(SIZE / 2);
    grid[y][x-1] = '#a0';

    for (let i = 0; i < word.crossword.length; i++) {
        grid[y][x+i] = word.crossword[i];
    }

    words_sorted_by_length.shift();

    let wordidx = 1;
    let placedWords = [word];
    // Place the rest of the words
    while (words_sorted_by_length.length > 0) {
        word = words_sorted_by_length[0];
        let unplacedWord = findBestSpotAndPlace(word.crossword,wordidx);

        if (unplacedWord) {
            unplacableWords.push(word);
        } else {
            placedWords[wordidx++]=word;
        }

        words_sorted_by_length.shift();
    }

    if (unplacableWords.length > 0) {
        unplacableWords.reverse();
        unplacableWords.forEach(word => {
            words.splice(words.indexOf(word), 1);
            words.unshift(word);
        });
        unplacableWords = [];
        return "fail";
    }
    displayCrossword(placedWords);
    return "success";
}

function findBestSpotAndPlace(word,wordidx) {
    const length = word.length;

    let spots = [];

    // Check horizontal
    for (let y = 0; y < SIZE; y++) {
        for (let x = 1; x < SIZE - 1 - length; x++) {
            let fits = true;
            let matchingLetters = 0;

            let left = Math.max(0, x - 1);
            let right = Math.min(SIZE - 1, x + length);
            const above = Math.max(0, y - 1);
            const below = Math.min(SIZE - 1, y + 1);

            // no words left or right allowed
            if (grid[y][left] || grid[y][right]) fits = false;

            // check all letters
            for (let p = 0; p < length; p++) {
                let thisChar = grid[y][x+p];
                if (thisChar) {
                    if (thisChar === word[p]) {
                        matchingLetters++;

                        left = Math.max(0, x + p - 1);
                        right = Math.min(SIZE - 1, x + p + 1);

                        if (grid[above][left] || grid[below][left] || grid[above][right] || grid[below][right]) fits = false;
                    } else {
                        fits = false;
                    }
                }
            }

            if (fits && matchingLetters > 0) {
                spots.push({x, y, matchingLetters, isVertical: false});
            }
        }
    }

    // Check vertical
    for (let y = 1; y < SIZE - 1 - length; y++) {
        for (let x = 0; x < SIZE; x++) {
            let fits = true;
            let matchingLetters = 0;

            const left = Math.max(0, x - 1);
            const right = Math.min(SIZE - 1, x + 1);
            let above = Math.max(0, y - 1);
            let below = Math.min(SIZE - 1, y + length);

            // no words above or below allowed
            if (grid[above][x] || grid[below][x]) fits = false;

            // check all letters
            for (let p = 0; p < length; p++) {
                let thisChar = grid[y+p][x];
                if (thisChar) {
                    if (thisChar === word[p]) {
                        matchingLetters++;

                        above = Math.max(0, y + p - 1);
                        below = Math.min(SIZE - 1, y + p + 1);

                        if (grid[above][left] || grid[above][right] || grid[below][left] || grid[below][right]) fits = false;
                    } else {
                        fits = false;
                    }
                }
            }

            if (fits && matchingLetters > 0) {
                spots.push({x, y, matchingLetters, isVertical: true});
            }
        }
    }

    spots = spots.sort((a, b) => a.matchingLetters - b.matchingLetters);

    if (spots.length < 1) return word;

    const randomIndex = Math.floor(Math.random() * spots.length);
    const bestSpot = spots[randomIndex];
    const x = bestSpot.x;
    const y = bestSpot.y;

    if (bestSpot.isVertical) {
        grid[y-1][x] = '#d'+wordidx;

        for (let i = 0; i < length; i++) {
            grid[y+i][x] = word[i];
        }
    } else {
        grid[y][x-1] = '#a'+wordidx;

        for (let i = 0; i < length; i++) {
            grid[y][x+i] = word[i];
        }
    }
}

function toggleAnswers() {
    document.querySelector('#grid').classList.toggle('hidden-answers');
}
function toggleColor() {
    document.querySelector('#grid').classList.toggle('print');
}