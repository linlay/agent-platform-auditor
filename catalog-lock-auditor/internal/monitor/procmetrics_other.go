//go:build !windows

package monitor

// ProcessMetrics holds OS-level resource telemetry for a single process.
type ProcessMetrics struct {
	Supported    bool    `json:"supported"`
	Handles      int     `json:"handles"`
	CPUTimeMs    int64   `json:"cpuTimeMs"`
	WorkingSetMB float64 `json:"workingSetMb"`
	ReadOps      uint64  `json:"readOps"`
	ReadBytes    uint64  `json:"readBytes"`
}

// SampleProcessMetrics is only implemented on Windows; other platforms return unsupported.
func SampleProcessMetrics(_ int) ProcessMetrics {
	return ProcessMetrics{}
}
