## PDFRenamer

A chrome extension that should allow you to more easily download and rename PDF files From selected sell side financial institutions.  This can probably be used with other websites, where you want to download PDF.  However it is primarily aimed at being able to download financial sell side Reports to a local client directory utilizing Chromium based browsers.

#### How to use

This is set up as a developer Chrome extension. What this means is you need to download the content of this github into a subdirectory. This subdirectory can have any name but an example would be C:\extensions\PDFRenamer.

**How to Install a Developer Chrome Extension (Unpacked Extension)**

1. **Prepare the Extension Files**
   - Make sure you have the extension files in a folder. as written about above, where I give the example\PDFRenamer.
  
2. **Open the Extensions Page in Chrome**
   - Open Google Chrome.
   - In the address bar, type:  
     `chrome://extensions`  
     and press Enter.

3. **Enable Developer Mode**
   - At the top right of the Extensions page, turn on the toggle for **Developer mode**.

4. **Load the Unpacked Extension**
   - Click the **Load unpacked** button (usually at the top left).
   - In the dialog that appears, navigate to the folder where your extension files are located.
   - Select the folder and click **Select Folder**.

5. **Verify Installation**
   - The extension should now appear in your list of extensions.
   - The extension has an icon, so it will also appear in your Chrome toolbar. Pin it for easy access by clicking the puzzle piece icon and then the pin next to your extension.

6. **Using the Extension**
   - Click the extension’s icon in the toolbar to use it.  This will bring up a dialog box for you to save the PDF, and it is the easiest way for you to use the extension.

7. **Updating the Extension**
   - If you make changes to the extension’s files, return to the `chrome://extensions` page and click the **refresh** icon (⟳) next to your extension to reload it.

**Note:**  
- The extension will only work as long as the files remain in the folder you selected. Don’t move or delete the folder unless you want to remove the extension.
- You may see a warning about developer mode; this is normal for unpacked extensions. You normally need to do something like reauthorized developer extensions every two weeks.

#### How to use once installed

This extension will create a File name that will give you three chunks of information that should allow you to quickly identify what is inside of the pdf. The key elements I have selected is an easy to sort date, using whatever is inside of your windows 11 clipboard buffer as a second element, and then finally appending whatever sub domain is showing on the web browser as the final part of the file name.

Once the extension has been loaded you can pin the extension to your chrome browser bar which is highly suggested. If you open up the extension you will see a list of different boxes that will allow you to set the default for whatever PDF you are going to download. Because this extension is aggressive and will take over every PDF download, the browser is set up so that you need to toggle it on and it is active for the next 60 minutes. That way if you walk away from your PC the next time you download a PDF it won't continue to be renamed. you can obviously turn off the extension by untoggling the extension.

If you are going to use this extension you only get two options for the date. I am a firm believer in that sorting files should always be done by the year first then the month then the day which allows you to quickly find any file in Windows 11 by simply sorting up or down without the confusion of one day not necessarily following the next. I allow you to put in both 8 digit numbers and six digit numbers, but I believe the 6 digit is superior for most applications.

Let's discuss websites where PDFS are used. Generally there are two methodologies by which websites present PDFS to you. The first methodology is easiest to work with this extension. You click on the PDF button in whatever website you are on and the website temporarily loads the PDF into a new window without downloading it onto your PC. An example of this would be the research provided at E trade by Morgan Stanley. In this scenario if you elect to see a research report as a PDF, it now displays inside of a new tab. At this point you can utilize the drop down menu from your extension to set the date That the domain which will translate into the person that did the sell side analysis is all put into one file name.

A real advantage of this extension is allowing you to highlight anything on the PDF and utilize this as your file name. Times this is a much better title than any default file name that the website provider may elect to give to you. It actually does not keep their name, and if you wanted to simply download as per their name then you would simply disable the extension.

Different websites will have different providers of sell side material. For example E trade research is done by Morgan Stanley. Therefore inside of your chrome extension folder you will find a CSV file which allows you to map domains to providers. For the most part this works well but in some instance the translation will fail. If the translation fails you can always elect to change the name in the drop down box and commit it to the final file name.

In some instances a website will elect to not open up the PDF inside of a new tab but immediately decide to download the PDF to your local machine. The tab will also work in this particular case but you must pre populate all the fields in the drop down tab before you download. In all circumstances when the file is being downloaded it will look at the last thing that you copied into your user clipboard. In the instance where you are forced to download directly to your PC and this extension intercepts the download, if you have your desired file name inside of your clipboard buffer It will utilize this for the file name that it's using to download. So you could elect to copy something on the page and utilize that for download even though it doesn't show up in a window. Also as long as the extension is enabled you can always set the date with the extension drop down. So you may want to SA save this or alternatively if you have saved as enabled you can rename the file before it is downloaded.

#### What goes into the file names

The first digits of the file name will be the year month and day. You can change the exact date during the final step when you save the file. However you do get a default of the current date in the save dialog box.

The second element in the file name is whatever is currently in your windows clipboard. If you highlighted a good word or two, this allows you to quickly put the subject of the PDF into the file name.

The third element is placing part of the website that you downloaded the pdf from as the final part of the file name. For example, if you were downloading a document from www.etrade.com, it would append etrade as the final item in your file name.

There is a special file in the subdirectory that holds all the parts of the extension called domain_map.csv.  If you open this file with the text editor you can make a translation table to turn a web address into another word of your choosing. For example, if you are downloading from Etrade, you may be downloading a financial document from Morgan Stanley. In the csv file, if you place "Etrade, MS" on a single line, before saving it will turn the normal Etrade file name into MS. Just make sure to have a single line for each translation, with the first word being the target for the translation, and the second word being what it will be transformed to.

#### Fixes

Version 1.0.2 had massive changes to the UI and is so different than previous versions that it should almost be considered a standalone product. I believe it is far better for most users and therefore I will drop any tracking of the older version.