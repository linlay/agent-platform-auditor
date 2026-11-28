//go:build windows

package monitor

import (
	"syscall"
	"unsafe"
)

// ProcessMetrics holds OS-level resource telemetry for a single process.
type ProcessMetrics struct {
	Supported    bool    `json:"supported"`
	Handles      int     `json:"handles"`
	CPUTimeMs    int64   `json:"cpuTimeMs"`
	WorkingSetMB float64 `json:"workingSetMb"`
	ReadOps      uint64  `json:"readOps"`
	ReadBytes    uint64  `json:"readBytes"`
}

type ioCounters struct {
	ReadOperationCount  uint64
	WriteOperationCount uint64
	OtherOperationCount uint64
	ReadTransferCount   uint64
	WriteTransferCount  uint64
	OtherTransferCount  uint64
}

type processMemoryCounters struct {
	CB                         uint32
	PageFaultCount             uint32
	PeakWorkingSetSize         uintptr
	WorkingSetSize             uintptr
	QuotaPeakPagedPoolUsage    uintptr
	QuotaPagedPoolUsage        uintptr
	QuotaPeakNonPagedPoolUsage uintptr
	QuotaNonPagedPoolUsage     uintptr
	PagefileUsage              uintptr
	PeakPagefileUsage          uintptr
}

var (
	modPsapi             = syscall.NewLazyDLL("psapi.dll")
	procGetProcessIo     = modKernel32.NewProc("GetProcessIoCounters")
	procGetProcessMemory = modPsapi.NewProc("GetProcessMemoryInfo")
)

func filetimeToMs(ft syscall.Filetime) int64 {
	nanos := (int64(ft.HighDateTime)<<32 + int64(ft.LowDateTime)) * 100
	return nanos / int64(1e6)
}

// SampleProcessMetrics reads handles, CPU time, working set memory, and disk read I/O counters for pid.
func SampleProcessMetrics(pid int) ProcessMetrics {
	if pid <= 0 {
		return ProcessMetrics{}
	}
	// GetProcessIoCounters needs QUERY_INFORMATION; PSAPI also needs VM_READ.
	// A successfully opened handle alone does not mean every sample succeeded.
	handle, _, _ := procOpenProcess.Call(0x0400|0x0010, 0, uintptr(pid))
	if handle == 0 {
		return ProcessMetrics{}
	}
	defer procCloseHandle.Call(handle)

	out := ProcessMetrics{Supported: true}

	var handles uint32
	if ret, _, _ := procGetProcessHandleCount.Call(handle, uintptr(unsafe.Pointer(&handles))); ret != 0 {
		out.Handles = int(handles)
	} else {
		out.Supported = false
	}

	var creation, exit, kernel, user syscall.Filetime
	if err := syscall.GetProcessTimes(syscall.Handle(handle), &creation, &exit, &kernel, &user); err == nil {
		out.CPUTimeMs = filetimeToMs(kernel) + filetimeToMs(user)
	} else {
		out.Supported = false
	}

	var ioC ioCounters
	if ret, _, _ := procGetProcessIo.Call(handle, uintptr(unsafe.Pointer(&ioC))); ret != 0 {
		out.ReadOps = ioC.ReadOperationCount
		out.ReadBytes = ioC.ReadTransferCount
	} else {
		out.Supported = false
	}

	var mem processMemoryCounters
	mem.CB = uint32(unsafe.Sizeof(mem))
	if ret, _, _ := procGetProcessMemory.Call(handle, uintptr(unsafe.Pointer(&mem)), uintptr(mem.CB)); ret != 0 {
		out.WorkingSetMB = float64(mem.WorkingSetSize) / (1024 * 1024)
	} else {
		out.Supported = false
	}

	return out
}
