const puppeteer = require('puppeteer');
const fs = require('fs');
const random_useragent = require('random-useragent');
const { EventEmitter } = require('events');

let input_file = 'Datasets/serviceWorkersSite.csv';
let permitions = true;

let url_list = [];
let ServiceWorkers = [];
let rawData;
let rawDataList;
let data;

describe("running the crawler", () => {

    /*
    process.argv.forEach(function (val, index, array) {
        console.log(index + ': ' + val);
    });
    */

    rawData = fs.readFileSync(input_file, {encoding: 'ascii'});
    rawDataList = rawData.split('\n');

    for(let j = 0; j < rawDataList.length; j++){
        data = rawDataList[j].split(',')[1];
        if(data === undefined)continue;
        if(data.search("http") !== -1)url_list.push(data);
        else if(data.search("www") !== -1)url_list.push("http://" + data);
        else url_list.push("http://www." + data);
    }

    if(url_list.length > 0)console.log("File " + input_file.split('/')[1] + " was successfully read.");
    
    for (let i = 0; i < url_list.length; i++){
        it("("+ (i + 1) + "/" + url_list.length + ") Checked " + url_list[i].split('/')[2], async() => {
            for(let reloadLoop = 0; reloadLoop < 3; reloadLoop++){
                console.log("Loop number #" + (reloadLoop + 1));

                // Step 1: launch browser and take the page.
                let browser = await puppeteer.launch({
                    headless: true,
                    defaultViewport: {
                        width: 1500,
                        height: 1000,
                        isMobile: false
                    },
                    devtools: false
                });
                let context = browser.defaultBrowserContext();
                let pages =  await browser.pages();
                let page = pages[0];
        
                let url = url_list[i];
        
                var swTargetFound;
                
                page.setDefaultNavigationTimeout(60000);

                // Step 2: Go to a URL and wait for a service worker to register.
                if (permitions) await context.overridePermissions(url, ["notifications"]);

                try{
                    await page.goto(url, {waitUntil: 'load'});
        
                    swTargetFound = await browser.waitForTarget(target => {
                        console.log(target.type());
                        console.log(target.url());
                        if(target.type() === 'service_worker'){
                            ServiceWorkers.push(target.url());
                            return true;
                        }
                    }, {
                        timeout: 15000
                    });

                    if(swTargetFound){
                        browser.close();
                        break;
                    }
                }catch(err){
                    try{
                        await page.goto(url);
        
                        swTargetFound = await browser.waitForTarget(target => {
                            console.log(target.type());
                            console.log(target.url());
                            if(target.type() === 'service_worker'){
                                ServiceWorkers.push(target.url());
                                return true;
                            }
                        }, {
                            timeout: 45000
                        });

                        if(swTargetFound){
                            browser.close();
                            break;
                        }
                    }catch(err){
                        if(reloadLoop === 2){
                            browser.close();
                            throw err;
                        }
                    }
                }finally{
                    browser.close();
                }
            }
        })
    }

    after(function(){
        try{
            var file = fs.createWriteStream('ServiceWorkers.txt');
            for(let writeLoop = 0; writeLoop < ServiceWorkers.length; writeLoop++){
                file.write(ServiceWorkers[writeLoop] + "\n");
            }
            file.end();
            console.log("\n\nServiceWorkers.cvs was successfully created!");
        }catch(err){
            console.log("\n\n");
            console.log(ServiceWorkers);
        }

        console.log("\n\n");
        console.log("         Statistics");
        console.log("=============================");
        console.log("\n");
        console.log("" + ServiceWorkers.length + "/" + url_list.length + " of sites registers a SW");
    })
})