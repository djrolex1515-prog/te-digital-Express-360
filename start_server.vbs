Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "C:\Users\PC\Documents\practica profesional\TE Digital 360 Modular\backend"
Set proc = shell.Exec("python server.py")
WScript.Echo "Started"
