{{- define "dockerconfigjson" }}
{{- if .Values.imageCredentials }}
{{- with .Values.imageCredentials }}
{{- printf "{\"auths\":{\"%s\":{\"username\":\"%s\",\"password\":\"%s\",\"email\":\"%s\",\"auth\":\"%s\"}}}" .registry .user .password .email (printf "%s:%s" .user .password | b64enc) | b64enc }}
{{- end }}
{{- end }}
{{- end -}}
