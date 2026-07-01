{{- define "booking.name" -}}
{{- .Release.Name }}-meeting-room-booking
{{- end }}

{{- define "booking.labels" -}}
app.kubernetes.io/name: meeting-room-booking
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "booking.selectorLabels" -}}
app.kubernetes.io/name: meeting-room-booking
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}