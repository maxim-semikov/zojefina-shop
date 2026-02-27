#!/bin/bash

# Скрипт для работы с Google Apps Script проектами

PROJECT=$1
COMMAND=$2

if [ -z "$PROJECT" ] || [ -z "$COMMAND" ]; then
  echo "Использование: ./deploy.sh [orders-processing|tilda-webhook|analytics] [push|pull|open|status]"
  echo ""
  echo "Примеры:"
  echo "  ./deploy.sh orders-processing push    # Отправить изменения orders-processing"
  echo "  ./deploy.sh tilda-webhook pull        # Получить изменения tilda-webhook"
  echo "  ./deploy.sh analytics push              # Отправить изменения analytics"
  echo "  ./deploy.sh orders-processing open    # Открыть в браузере"
  exit 1
fi

case $PROJECT in
  orders-processing)
    DIR="google-app-scripts/orders-processing"
    ;;
  tilda-webhook)
    DIR="google-app-scripts/tilda-webhook-import-orders"
    ;;
  analytics)
    DIR="google-app-scripts/analytics"
    ;;
  *)
    echo "Неизвестный проект: $PROJECT"
    echo "Доступные проекты: orders-processing, tilda-webhook, analytics"
    exit 1
    ;;
esac

echo "=== $PROJECT: $COMMAND ==="
cd "$DIR" || exit 1

case $COMMAND in
  push)
    clasp push
    ;;
  pull)
    clasp pull
    ;;
  open)
    clasp open
    ;;
  status)
    clasp status
    ;;
  *)
    echo "Неизвестная команда: $COMMAND"
    echo "Доступные команды: push, pull, open, status"
    exit 1
    ;;
esac
