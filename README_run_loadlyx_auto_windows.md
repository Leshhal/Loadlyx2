# Windows Double-Click Launcher

Additional file:
- `run_loadlyx_auto.bat`

## What it does
This `.bat` file lets you start the automatic setup script by double-clicking it in Windows.

It will:
1. look for `run_loadlyx_auto.sh` in the same folder
2. look for **Git Bash**
3. ask whether you want to use:
   - a ZIP file
   - an extracted folder
   - the current folder
4. run the full automatic setup script

## Important
You must keep these two files in the **same folder**:

- `run_loadlyx_auto.sh`
- `run_loadlyx_auto.bat`

## How to use
1. Put both files in the same folder
2. Double-click:

```text
run_loadlyx_auto.bat
```

3. Choose:
- `1` for ZIP file
- `2` for extracted folder
- `3` for current folder

4. Paste the Windows path when asked

Example ZIP path:

```text
C:\Users\YourName\Downloads\loadlyx_phase1_5_dark_ui.zip
```

Example extracted folder path:

```text
C:\Users\YourName\Downloads\loadlyx_phase1_5_dark_ui
```

## If Git Bash is missing
Install **Git for Windows** first, then run the `.bat` again.
