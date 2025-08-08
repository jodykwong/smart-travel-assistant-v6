{{/*
智游助手v6.2 Helm辅助模板
Week 5-6: CD Pipeline构建 - 模板函数定义
*/}}

{{/*
扩展chart名称
*/}}
{{- define "smart-travel.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
创建完整的应用名称
*/}}
{{- define "smart-travel.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
创建chart标签
*/}}
{{- define "smart-travel.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
通用标签
*/}}
{{- define "smart-travel.labels" -}}
helm.sh/chart: {{ include "smart-travel.chart" . }}
{{ include "smart-travel.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: smart-travel-platform
app.kubernetes.io/component: web-application
{{- end }}

{{/*
选择器标签
*/}}
{{- define "smart-travel.selectorLabels" -}}
app.kubernetes.io/name: {{ include "smart-travel.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
创建服务账户名称
*/}}
{{- define "smart-travel.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "smart-travel.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
创建镜像拉取密钥
*/}}
{{- define "smart-travel.imagePullSecrets" -}}
{{- with .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}

{{/*
创建完整的镜像名称
*/}}
{{- define "smart-travel.image" -}}
{{- $registry := .Values.global.imageRegistry -}}
{{- $project := .Values.global.imageProject -}}
{{- $repository := .Values.app.image.repository -}}
{{- $tag := .Values.app.image.tag | default .Chart.AppVersion -}}
{{- if $registry -}}
{{- printf "%s/%s/%s:%s" $registry $project $repository $tag -}}
{{- else -}}
{{- printf "%s/%s:%s" $project $repository $tag -}}
{{- end -}}
{{- end }}

{{/*
创建数据库连接字符串
*/}}
{{- define "smart-travel.databaseUrl" -}}
{{- if .Values.postgresql.enabled -}}
{{- printf "postgresql://%s:%s@%s-postgresql:5432/%s" .Values.postgresql.auth.username .Values.postgresql.auth.password (include "smart-travel.fullname" .) .Values.postgresql.auth.database -}}
{{- else if .Values.externalDatabase.enabled -}}
{{- printf "postgresql://%s:%s@%s:%d/%s" .Values.externalDatabase.username .Values.externalDatabase.password .Values.externalDatabase.host .Values.externalDatabase.port .Values.externalDatabase.database -}}
{{- end -}}
{{- end }}

{{/*
创建Redis连接字符串
*/}}
{{- define "smart-travel.redisUrl" -}}
{{- if .Values.redis.enabled -}}
{{- if .Values.redis.auth.enabled -}}
{{- printf "redis://:%s@%s-redis-master:6379" .Values.redis.auth.password (include "smart-travel.fullname" .) -}}
{{- else -}}
{{- printf "redis://%s-redis-master:6379" (include "smart-travel.fullname" .) -}}
{{- end -}}
{{- else if .Values.externalRedis.enabled -}}
{{- if .Values.externalRedis.password -}}
{{- printf "redis://:%s@%s:%d" .Values.externalRedis.password .Values.externalRedis.host .Values.externalRedis.port -}}
{{- else -}}
{{- printf "redis://%s:%d" .Values.externalRedis.host .Values.externalRedis.port -}}
{{- end -}}
{{- end -}}
{{- end }}

{{/*
创建监控标签
*/}}
{{- define "smart-travel.monitoringLabels" -}}
prometheus.io/scrape: "true"
prometheus.io/port: {{ .Values.app.port | quote }}
prometheus.io/path: {{ .Values.app.env.PROMETHEUS_ENDPOINT | quote }}
monitoring.smarttravel.com/enabled: "true"
monitoring.smarttravel.com/registry: {{ .Values.global.monitoring.metricsRegistry | quote }}
monitoring.smarttravel.com/collector: {{ .Values.global.monitoring.metricsCollector | quote }}
monitoring.smarttravel.com/error-handler: {{ .Values.global.monitoring.errorHandler | quote }}
{{- end }}

{{/*
创建支付系统保护标签
*/}}
{{- define "smart-travel.paymentProtectionLabels" -}}
{{- if .Values.deployment.paymentProtection.enabled }}
payment.smarttravel.com/protection: "enabled"
payment.smarttravel.com/strategy: {{ .Values.deployment.paymentProtection.strategy | quote }}
payment.smarttravel.com/monitoring: {{ .Values.deployment.paymentProtection.monitoring | quote }}
{{- end }}
{{- end }}

{{/*
创建安全上下文
*/}}
{{- define "smart-travel.securityContext" -}}
allowPrivilegeEscalation: false
runAsNonRoot: true
runAsUser: {{ .Values.global.security.runAsUser }}
runAsGroup: {{ .Values.global.security.runAsUser }}
readOnlyRootFilesystem: true
capabilities:
  drop:
  - ALL
{{- end }}

{{/*
创建Pod安全上下文
*/}}
{{- define "smart-travel.podSecurityContext" -}}
fsGroup: {{ .Values.global.security.fsGroup }}
runAsNonRoot: true
seccompProfile:
  type: RuntimeDefault
{{- end }}

{{/*
创建资源配置
*/}}
{{- define "smart-travel.resources" -}}
{{- if .Values.app.resources }}
resources:
  {{- toYaml .Values.app.resources | nindent 2 }}
{{- end }}
{{- end }}

{{/*
创建健康检查配置
*/}}
{{- define "smart-travel.healthChecks" -}}
{{- if .Values.app.healthCheck.enabled }}
livenessProbe:
  {{- toYaml .Values.app.healthCheck.livenessProbe | nindent 2 }}
readinessProbe:
  {{- toYaml .Values.app.healthCheck.readinessProbe | nindent 2 }}
startupProbe:
  {{- toYaml .Values.app.healthCheck.startupProbe | nindent 2 }}
{{- end }}
{{- end }}

{{/*
创建环境变量
*/}}
{{- define "smart-travel.env" -}}
{{- range $key, $value := .Values.app.env }}
- name: {{ $key }}
  value: {{ $value | quote }}
{{- end }}
{{- end }}

{{/*
创建卷挂载
*/}}
{{- define "smart-travel.volumeMounts" -}}
- name: tmp
  mountPath: /tmp
- name: cache
  mountPath: /app/.next/cache
- name: logs
  mountPath: /app/logs
{{- if .Values.persistence.enabled }}
- name: data
  mountPath: /app/data
{{- end }}
{{- end }}

{{/*
创建卷定义
*/}}
{{- define "smart-travel.volumes" -}}
- name: tmp
  emptyDir: {}
- name: cache
  emptyDir: {}
- name: logs
  emptyDir: {}
{{- if .Values.persistence.enabled }}
- name: data
  persistentVolumeClaim:
    claimName: {{ include "smart-travel.fullname" . }}-pvc
{{- end }}
{{- end }}
