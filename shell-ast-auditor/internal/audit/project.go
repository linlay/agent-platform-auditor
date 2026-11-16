package audit

import "strings"

// MapProjectTemplate is literal template expansion, not Shell path analysis.
// Only the complete /project root or its descendants are templates; names such
// as /projects, /other/project and URLs are not. The host adapter validates that
// the replacement cannot introduce Shell syntax before calling this function.
func MapProjectTemplate(command, directory string) string {
	var out strings.Builder
	for i := 0; i < len(command); {
		const root = "/project"
		end := i + len(root)
		if strings.HasPrefix(command[i:], root) &&
			(i == 0 || strings.ContainsRune(" \t\r\n\"'=;|&()<>{}", rune(command[i-1]))) &&
			(end == len(command) || command[end] == '/' || strings.ContainsRune(" \t\r\n\"';|&()<>{}", rune(command[end]))) {
			out.WriteString(strings.TrimRight(directory, "/"))
			i = end
		} else {
			out.WriteByte(command[i])
			i++
		}
	}
	return out.String()
}
