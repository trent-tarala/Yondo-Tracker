# Yondo Tracker

A probability tracker for Yondo streams. This application helps you track pulled packs and provides real-time probabilities for remaining pulls.

## 🎯 Features

### Dashboard
- Create multiple tracking projects
- View all your past and current projects
- See project status (Not Started, In Progress, Completed)
- Easy access to previous results

### Pack Tracking
- Track 60 packs in real-time
- Mark packs as:
  - Chaser (Green)
  - Team (Blue)
  - Floor (Red)
- See which packs are still available
- View real-time probabilities for remaining pulls

### Team Tracking
- Visual grid of all 32 NFL teams
- Teams automatically marked when pulled
- Each team displays in its official team color
- Easy to see which teams are still available

### Packs You Pulled
- Track which packs you personally pulled vs. observed
- Check "This was a pack I pulled" when marking packs
- View your personal pulls in a dedicated table
- See pack number, type, and team (if applicable)
- Remove packs from your list if marked by accident
- Completed projects lock the pulled packs list

### Real-time Probabilities
The app automatically calculates and displays your chances of pulling:
- Chaser Pack
- Team Pack
- Floor Pack

These probabilities update instantly as you mark packs.

#### Probability Deviation Chart
A dynamic line chart that visualizes how probabilities change over time:
- Shows current probability vs. baseline for each category
- Toggle between Chasers, Teams, and Floors
- Baseline indicator shows how far current odds deviate from starting probability:
  - 🟡 Yellow: Within ±5% of baseline
  - 🟢 Green: More than 5% above baseline
  - 🔴 Red: More than 5% below baseline
- Smooth line tracks probability changes as packs are opened
- X-axis shows all 60 packs
- Y-axis displays probability percentage
- Hover over any point to see exact values

## 💻 Installation

1. Download this project to your computer:
   - Click the green "Code" button at the top of this page
   - Select "Download ZIP"
   - Once downloaded, extract/unzip the folder to anywhere on your computer

2. Open the project:
   - Go to the folder you just extracted
       - Find and double-click the `home.html` file (it will open to the dashboard)
   - The app will open in your default web browser

That's it! The app runs entirely in your browser and saves all data locally on your computer.

## ⬆️ How to Update to a New Version

Your project data is saved on your computer, which is great! But it means you need to be careful when updating to a new version of the tracker so you don't lose your progress.

Follow these steps to update safely:

1.  **Download and Prepare the New Version**
    *   Download the new `.zip` file for the latest version.
    *   Extract the ZIP file:
        * Windows: Right-click the file and select "Extract All..."
        * Mac: Double-click the file to automatically extract it
        * This will create a folder named `yondo-tracker-main`.
    *   **Important:** When you open this folder, you will likely see *another folder* with the same name inside. This inner folder is the one with the actual application code. **Move this inner folder** into the same directory folder where you want to keep the application. Once it has been removed, there will be two folders with identical names in the same directory. One has the code, the other is completely empty at this point. Delete the empty one. 

2.  **Get Your Old Folder Ready**
    *   Go to where you have your current, working version of the tracker saved.
    *   **Rename your current folder.** For example, if your folder is named `yondo-tracker-main`, rename it to `yondo-tracker-old`. This keeps it as a backup.

3.  **Move the New Version Into Place**
    *   Now, find the new application folder you moved in Step 1.
    *   **Rename this new folder** to match the *original* name of your old folder. For example, if your old folder was `yondo-tracker-main`, name the new one `yondo-tracker-main`.
    *   Move this newly renamed folder to the same location where your old one was (e.g., into the `C:\Yondo\` folder from the example below).

Now, when you open `home.html` from the `C:\Yondo\Yondo-Tracker` folder, the new version of the app will load with all of your previous projects and data intact!

## 💾 Data Management (Import & Export)

Your data is saved in your browser, which is convenient but can be lost if you clear your browser's cache. To keep your data safe, you can use the built-in import and export tools.

*   **Export Data:**
    1.  On the dashboard, click the **"Export Data"** button.
    2.  This will save a single file named `yondo-tracker-backup.json` to your computer's "Downloads" folder.
    3.  This file contains all of your projects. Save this file in a safe place!

*   **Import Data:**
    1.  On the dashboard, click the **"Import Data"** button.
    2.  Select the `yondo-tracker-backup.json` file you previously saved.
    3.  A confirmation box will appear. **Warning:** Importing a file will overwrite all existing projects in the tracker.
    4.  If you confirm, all projects from the file will be loaded into the application.

This is the best way to back up your work, move it between different computers, or recover it if your browser data is ever cleared.

## 📖 How to Use

### Getting Started
1. Open the application in your web browser
2. Click "New Project" on the dashboard
3. Enter a name for your project (example: "January 2024 Break")
4. Click "Create"

### Tracking Packs
1. When a pack is pulled, click its number in the grid
2. Select the type of pack:
   - **Chaser**: For Chaser packs (1-8)
   - **Team**: For team packs (select specific team)
   - **Floor**: For floor packs
3. **Optional**: Check "This was a pack I pulled" if you personally pulled this pack
4. The probabilities will automatically update
5. The Teams Pulled section will update if you selected a team
6. Your personal pulls will appear in the "Packs You Pulled" table

### Reading Probabilities
The probability panel shows your chances for each type of pack:
- These numbers are calculated based on what's left
- Example: If "Chaser: 25%" appears, you have a 25% chance of pulling a chaser with your next pack

The probability deviation chart helps track probability changes:
- Use the toggles to switch between Chasers, Teams, and Floors
- The grey line shows the starting probability (baseline)
- The solid line shows how probabilities change as packs are opened
- The deviation indicator shows if you're above/below baseline:
  - Yellow means you're close to baseline (within ±5%)
  - Green means probabilities are better than baseline (>5% above)
  - Red means probabilities are worse than baseline (>5% below)
- Hover over the line to see exact probabilities at any point

### Teams Section
- All 32 NFL teams are displayed
- Unpulled teams appear in gray
- Pulled teams show in their team colors
- Teams are alphabetically ordered for easy reference

### Packs You Pulled Section
- Shows only the packs you personally pulled
- Displays pack number, type, and team name (if applicable)
- Use the trash icon to remove packs if marked by accident
- Completed projects disable the trash icons to prevent changes
- Empty state shows "You haven't picked anything yet"

### Project Controls
- **Mark Complete**: Click when you're done to save the final state. This prevents accidental changes when reviewing historical data. 
- **Reset All**: Starts over (careful - this can't be undone!)
- **Back to Dashboard**: Return to project list

### Viewing Past Projects
1. Go to the dashboard
2. Find your project in the list
3. Click the project name to view it
4. Completed projects are read-only

## 💡 Tips
- **Save Automatically**: All changes save instantly - no need to manually save
- **Team Colors**: Each NFL team shows in its official color when pulled
- **Quick Reference**: Hover over any team-marked pack to see which team it was
- **Project Organization**: Create separate projects for each different stream
- **Completion**: Use "Mark Complete" when done to prevent accidental changes

## 🎨 Color Guide
- **Green**: Chaser packs
- **Blue**: Team packs
- **Red**: Floor packs
- **Gray**: Unopened packs
- Each NFL team uses its official team color

## ❓ Common Questions

**Q: Can I undo a mistake?**  
A: Yes! Just click the pack again and select the correct option.

**Q: Will I lose my progress if I close the browser?**  
A: No, everything saves automatically.

**Q: Can I edit a completed project?**  
A: No, completed projects are locked to prevent accidental changes.

**Q: How are probabilities calculated?**  
A: The app uses the remaining pack counts divided by total unopened packs to calculate percentages.

**Q: What does the baseline in the probability chart mean?**  
A: The baseline is your starting probability for each type (e.g., 13.33% for Chasers since 8/60 = 13.33%). It helps you see if your current odds are better or worse than what you started with.

## 📞 Support
Don't ask for help.