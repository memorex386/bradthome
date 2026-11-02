// The fake gh's launcher on Windows, compiled to gh.exe by the tests, since
// Node finds only .exe files on PATH there. It reads node's path and the fake's
// script from gh.json beside it, runs them with this command line's arguments,
// and passes on the output and the exit code.

using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

static class Launcher
{
    static string Field(string json, string name)
    {
        var key = "\"" + name + "\"";
        var at = json.IndexOf(key, StringComparison.Ordinal);
        var start = json.IndexOf('"', json.IndexOf(':', at + key.Length) + 1) + 1;
        var end = json.IndexOf('"', start);
        return json.Substring(start, end - start).Replace("\\\\", "\\");
    }

    static string Rest(string line)
    {
        var i = 0;
        if (line.StartsWith("\""))
        {
            i = line.IndexOf('"', 1) + 1;
        }
        else
        {
            while (i < line.Length && line[i] != ' ' && line[i] != '\t') i++;
        }
        return i >= line.Length ? "" : line.Substring(i).TrimStart();
    }

    static void Pump(Stream from, Stream to)
    {
        from.CopyTo(to);
        to.Flush();
    }

    static int Main()
    {
        var folder = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule.FileName);
        var json = File.ReadAllText(Path.Combine(folder, "gh.json"));
        var info = new ProcessStartInfo(Field(json, "node"))
        {
            Arguments = "\"" + Field(json, "script") + "\" \"" + folder + "\" " + Rest(Environment.CommandLine),
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        using (var child = Process.Start(info))
        {
            var stdout = Console.OpenStandardOutput();
            var stderr = Console.OpenStandardError();
            var outThread = new Thread(() => Pump(child.StandardOutput.BaseStream, stdout));
            var errThread = new Thread(() => Pump(child.StandardError.BaseStream, stderr));
            outThread.Start();
            errThread.Start();
            child.WaitForExit();
            outThread.Join();
            errThread.Join();
            return child.ExitCode;
        }
    }
}
