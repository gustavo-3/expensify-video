const express = require('express')
const app = express()
const https = require('https');
const fs = require('fs')
const port = process.env.PORT || 3000

var LoremIpsum = require('lorem-ipsum').LoremIpsum;

const download = (uri,cb)=>{
    const file = fs.createWriteStream("file.mp4");
    const request = https.get(uri, function(response) {
       response.pipe(file);
    
       // after download completed close filestream
       file.on("finish", () => {
           file.close();
           console.log("Download Completed");
           cb()
       });
    });
}

var lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 8,
    min: 4
  },
  wordsPerSentence: {
    max: 16,
    min: 4
  }
});

app.get('/', (req, res) => res.send('hello world!'))

app.get('/video', async (req, res) => {
    const {uri} = req.query;
    const encodedUri = uri.split('encryptedAuthToken=')[0] + "encryptedAuthToken=" + encodeURIComponent(uri.split('encryptedAuthToken=')[1])

    download(encodedUri,()=>{
        let filePath='file.mp4'
        // Listing 3.
        const options = {};
    
        let start;
        let end;
    
        const range = req.headers.range;
        if (range) {
            const bytesPrefix = "bytes=";
            if (range.startsWith(bytesPrefix)) {
                const bytesRange = range.substring(bytesPrefix.length);
                const parts = bytesRange.split("-");
                if (parts.length === 2) {
                    const rangeStart = parts[0] && parts[0].trim();
                    if (rangeStart && rangeStart.length > 0) {
                        options.start = start = parseInt(rangeStart);
                    }
                    const rangeEnd = parts[1] && parts[1].trim();
                    if (rangeEnd && rangeEnd.length > 0) {
                        options.end = end = parseInt(rangeEnd);
                    }
                }
            }
        }
    
        res.setHeader("content-type", "video/mp4");
    
        fs.stat(filePath, (err, stat) => {
            if (err) {
                console.error(`File stat error for ${filePath}.`);
                console.error(err);
                res.sendStatus(500);
                return;
            }
    
            let contentLength = stat.size;
    
            // Listing 4.
            if (req.method === "HEAD") {
                res.statusCode = 200;
                res.setHeader("accept-ranges", "bytes");
                res.setHeader("content-length", contentLength);
                res.end();
            }
            else {       
                // Listing 5.
                let retrievedLength;
                if (start !== undefined && end !== undefined) {
                    retrievedLength = (end+1) - start;
                }
                else if (start !== undefined) {
                    retrievedLength = contentLength - start;
                }
                else if (end !== undefined) {
                    retrievedLength = (end+1);
                }
                else {
                    retrievedLength = contentLength;
                }
    
                // Listing 6.
                res.statusCode = start !== undefined || end !== undefined ? 206 : 200;
    
                res.setHeader("content-length", retrievedLength);
    
                if (range !== undefined) {  
                    res.setHeader("content-range", `bytes ${start || 0}-${end || (contentLength-1)}/${contentLength}`);
                    res.setHeader("accept-ranges", "bytes");
                }
    
                // Listing 7.
                const fileStream = fs.createReadStream(filePath, options);
                fileStream.on("error", error => {
                    console.log(`Error reading file ${filePath}.`);
                    console.log(error);
                    res.sendStatus(500);
                });
    
    
                fileStream.pipe(res);
            }
        })
    })
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
