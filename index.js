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
    const he = data.he;
    const linkclues = await getLinkClues(he,ref);
    const contextclues = getContextClues(he);
    displayClues(linkclues.concat(contextclues));
    // displayClues(contextclues);
};

getLinkClues = async (he,ref) => {
    const response = await fetch(`https://www.sefaria.org/api/links/${ref}`);
    const data = await response.json();
    let clues = data.filter(link=>link.category==="Commentary"&&link.anchorVerse).flatMap(link=>{
        // console.log(link)
        if (!link.he || !link.he.length || link.anchorRefExpanded.length>1) return [];
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
        if (words.length<7)
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