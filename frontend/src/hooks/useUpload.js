
// The upload state machine, now wired to the REAL backend.
// idle -> uploading -> processing -> done (or error)
//
// All actual image analysis, scoring, and PDF generation happens
// on the backend - this hook just sends the file and displays whatever comes back.

import { useState, useCallback } from "react";
import api from "../api.js"; 

export function useUpload(getToken) {
  const [state,    setState]    = useState("idle");
  const [progress, setProgress] = useState(0);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  const submit = useCallback(async (file, selection) => {
    try {
      setState("uploading");
      setProgress(0);
      setResult(null);
      setError(null);

      // FormData is required because we're sending a binary file, not plain JSON. The field names here MUST match what
      // Multer expects in routes/jobs.js
      const formData = new FormData();
      formData.append("image", file);
      formData.append("vendorId",  selection.vendorId);
      formData.append("productId", selection.productId);

      // If the user is logged in, getToken() returns the JWT.
      // If not, it returns null and we send no Authorization header - optionalAuth on the backend handles that as a guest upload.
      const token = getToken ? getToken() : null;

      const { data } = await api.post("/api/jobs/upload", formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},

        // onUploadProgress fires repeatedly while the FILE itself
        // is being transmitted to the server. Once the file is fully received, this stops - the backend then runs Sharp/scoring/PDF
        // which can take several more seconds with no progress events
        // (that's why we switch to "processing" state below).
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setProgress(percent);
          if (percent === 100) {
            // File fully sent, but backend hasn't responded yet - it's now running Sharp + scoring + PDF generation
            setState("processing");
          }
        },
      });

      // data is exactly what jobController.js returned:
      // { jobId, score, qualityLabel, checks, issues, suggestions,
      //   aiInsights, meta, outputs: { original, processed, pdf } }
      setResult(data);
      setState("done");

    } catch (err) {
      // err.response?.data?.message is the clean error message
      // our errorHandler.js sends back (e.g. "File too large",
      // "No spec found for vendor/product")
      setError(err.response?.data?.message || "Upload failed. Check your connection and try again.");
      setState("error");
    }
  }, [getToken]);//uses the same func unless this dependancy changes

  const reset = useCallback(() => {
    setState("idle");
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  return { state, progress, result, error, submit, reset };
}