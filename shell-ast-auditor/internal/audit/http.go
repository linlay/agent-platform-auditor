package audit

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
)

func decode(w http.ResponseWriter, r *http.Request, v interface{}) error {
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128<<10))
	d.DisallowUnknownFields()
	if e := d.Decode(v); e != nil {
		return e
	}
	if d.Decode(new(interface{})) != io.EOF {
		return errors.New("expected one JSON object")
	}
	return nil
}
func reply(w http.ResponseWriter, v interface{}, e error) {
	w.Header().Set("Content-Type", "application/json")
	if e != nil {
		code := 400
		if os.IsNotExist(e) {
			code = 404
		}
		http.Error(w, e.Error(), code)
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}
func (r *Runner) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/testsets", func(w http.ResponseWriter, q *http.Request) { sets, e := r.Store.Testsets(); reply(w, sets, e) })
	mux.HandleFunc("GET /api/testsets/{id}", func(w http.ResponseWriter, q *http.Request) {
		set, e := r.Store.Testset(q.PathValue("id"))
		reply(w, set, e)
	})
	mux.HandleFunc("GET /api/runs", func(w http.ResponseWriter, q *http.Request) { runs, e := r.Store.Runs(); reply(w, runs, e) })
	mux.HandleFunc("POST /api/runs", func(w http.ResponseWriter, q *http.Request) {
		var input struct {
			ProjectDir string         `json:"projectDir,omitempty"`
			Kind       string         `json:"kind,omitempty"`
			Review     *ReviewOptions `json:"review,omitempty"`
			TestsetID  string         `json:"testsetId"`
			CaseIDs    []string       `json:"caseIds"`
		}
		if e := decode(w, q, &input); e != nil {
			reply(w, nil, e)
			return
		}
		run, e := r.StartWithKind(input.TestsetID, input.CaseIDs, input.Review, input.Kind, input.ProjectDir)
		reply(w, run, e)
	})
	mux.HandleFunc("GET /api/runs/{id}", func(w http.ResponseWriter, q *http.Request) {
		run, e := r.Store.Run(q.PathValue("id"))
		reply(w, run, e)
	})
	mux.HandleFunc("GET /api/runs/{id}/cases/{caseId}", func(w http.ResponseWriter, q *http.Request) {
		result, e := r.Store.Result(q.PathValue("id"), q.PathValue("caseId"))
		reply(w, result, e)
	})
	mux.HandleFunc("POST /api/runs/{id}/cancel", func(w http.ResponseWriter, q *http.Request) {
		e := r.Cancel(q.PathValue("id"))
		reply(w, map[string]string{"state": "cancelling"}, e)
	})
	mux.HandleFunc("GET /api/comparisons", func(w http.ResponseWriter, q *http.Request) { c, e := r.Store.Comparisons(); reply(w, c, e) })
	mux.HandleFunc("GET /api/comparisons/{id}", func(w http.ResponseWriter, q *http.Request) {
		c, e := r.Store.Comparison(q.PathValue("id"))
		reply(w, c, e)
	})
	mux.HandleFunc("POST /api/comparisons", func(w http.ResponseWriter, q *http.Request) {
		var input struct {
			BaseRunID   string `json:"baseRunId"`
			TargetRunID string `json:"targetRunId"`
		}
		if e := decode(w, q, &input); e != nil {
			reply(w, nil, e)
			return
		}
		c, e := r.Store.Compare(input.BaseRunID, input.TargetRunID)
		reply(w, c, e)
	})
}
