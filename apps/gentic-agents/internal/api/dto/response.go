package dto

// InvokeResponse is the JSON response for POST /invoke.
type InvokeResponse struct {
	OK     bool   `json:"ok"`
	Output string `json:"output,omitempty"`
	Intent string `json:"intent,omitempty"`
	Error  string `json:"error,omitempty"`
}
