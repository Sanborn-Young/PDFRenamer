## PDFRenamer

A chrome extension that should allow you to more easily download and rename PDF files.

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

Open up any PDF inside of Chrome. Many times if a website has a PDF, if you click on it it will open it up inside of a tab. This is where you want to do all of your work.

Now you want to select a name for this PDF. Look at your document and highlight any section that you think would be a good name for this file. So now this is the one thing you'll need to absorb as concept. Once this is highlighted, you need to copy this into your Windows clipboard buffer. You can do this by pressing the right mouse button, and selecting copy. Or simply pressing control plus C on your keyboard. The extension will use what is ever inside of your windows clipboard buffer as the second element in your file name. 

By the way, this name will be inserted into a dialog box for your approval before downloading and saving the file.  For example, I have a tendency to download a lot of reports on various companies, almost always the report starts off with the title, which turns out to be a good name for the file.

Now select the extension icon that you pinned to your browser bar.  You will get a dialog box that gives you the following options.

| Setting                                | Value / Description                                |
|----------------------------------------|----------------------------------------------------|
| Auto Rename PDFs                       | ✅ Enabled                                         |
| Use Clipboard Content in Filename      | ✅ Enabled                                         |
| Use Date in Filename                   | ✅ Enabled                                         |
| Date Format                            | YYMMDD                                             |
| Filename Preview                       | 250629_clipboard-content_ Web sub domain.pdf            |
| Buttons                                | - Capture Clipboard for Next PDF                  |
|                                        | - Save Settings             |
|                                        | - Download Current Tab Clipboard Name                                   |

The main button you will probably use in most circumstances is the bottom one "Download Current Tab Clipboard Name". This button tells you that it is going to save the current tab using information that is from the current tab, and using whatever section you copied onto your windows clipboard.

The other buttons really don't need to be used Unless you have a problem with the bottom button or unless you wanna turn off the extension. 

The save button will save the format of the year according to whatever the pull down box says. The other button to capture something off the clipboard is only if you determine that you want to save using the chrome download button that is actually on the pdf. As long as you have the extension icon up and easy to get to it makes more sense to simply use the lowest button, which both uses the clipboard to rename the file and also download the file.

As mentioned before, from a practical standpoint you should have this extension pin to your browser bar. If you do it in this fashion, it will allow you to click on the icon, uncheck the box which makes it active. And then you can save this state so it no longer will rename files. This way you don't need to go into the extension detail box to turn the extension on and off. You'll do it from your browser bar.

But as mentioned above, you will get the option to update the final file name in the final file save dialog box.

#### What goes into the file names

The first digits of the file name will be the year month and day. You can change the exact date during the final step when you save the file. However you do get a default of the current date in the save dialog box.

The second element in the file name is whatever is currently in your windows clipboard. If you highlighted a good word or two, this allows you to quickly put the subject of the PDF into the file name.

The third element is placing part of the website that you downloaded the pdf from as the final part of the file name. For example, if you were downloading a document from www.etrade.com, it would append etrade as the final item in your file name.

There is a special file in the subdirectory that holds all the parts of the extension called domain_map.csv.  If you open this file with the text editor you can make a translation table to turn a web address into another word of your choosing. For example, if you are downloading from Etrade, you may be downloading a financial document from Morgan Stanley. In the csv file, if you place "Etrade, MS" on a single line, before saving it will turn the normal Etrade file name into MS. Just make sure to have a single line for each translation, with the first word being the target for the translation, and the second word being what it will be transformed to.

#### Fixes

Note original version push to get hub had an issue where the pull down box for the extension had a non operational checkbox that would not turn off the extension when checked and saved. This has been fixed with the version here.