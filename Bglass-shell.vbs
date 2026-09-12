Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

nodeExe = "node"
If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
    nodeExe = """C:\Program Files\nodejs\node.exe"""
End If

electronCli = scriptDir & "\node_modules\electron\cli.js"
If fso.FileExists(electronCli) Then
    WshShell.Run nodeExe & " """ & electronCli & """ """ & scriptDir & """", 0, False
Else
    WshShell.Run "cmd /c npm start", 0, False
End If
