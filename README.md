# Daf Yomi Crossword

This project automatically generates a crossword puzzle based on any page of Talmud. The clues ask you to find words used on the page based on their context, or to find the words that commentaries choose to comment on.

When you first open the webapp, the crossword puzzle shown will be based on that day's Daf Yomi page. To change it just type in a new daf and hit enter.
 
This is powered using Sefaria's API. The [Calendar API](https://github.com/Sefaria/Sefaria-Project/wiki/API-Documentation#calendar-api) finds the what the current Daf Yomi daf is, the [Text API](https://github.com/Sefaria/Sefaria-Project/wiki/API-Documentation#text-api) pulls up the page, and the [Link API](https://github.com/Sefaria/Sefaria-Project/wiki/API-Documentation#links-api) is used to find associated commentaries.

Sefaria does not consistently designate which words each commentary is written on, and so this is determined by splitting each commentary along some of the common separators (e.g. html tags, :, -), and then searching if the source text contains any of those segments. 

The crossword generation algorithm is based on https://github.com/nknickrehm/crossword

The project currently only works with Talmud, but in theory can easily be extended to work on other sefaria texts as well. It can be a fun tool for personal review or for educators.
