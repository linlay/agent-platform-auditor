//go:build !windows

package monitor

// ProcessHandleCount is only implemented on Windows; other platforms report unsupported.
func ProcessHandleCount() (int, bool) {
	return -1, false
}

// ProcessHandleCountByPID is only implemented on Windows; other platforms report unsupported.
func ProcessHandleCountByPID(_ int) (int, bool) {
	return -1, false
}
