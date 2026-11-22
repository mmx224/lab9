# MuzKlub

Музыкальное сообщество для поиска единомышленников. Клиентская часть построена на React, TypeScript и Vite. Интерфейс включает регистрацию, вход, личный профиль музыканта и редактирование анкеты.

## Запуск

Нужен Node.js 24 или новее.

```sh
npm ci
npm run dev
```

Откройте адрес, который покажет Vite. Перед публикацией можно собрать production-версию командой `npm run build`.

## Структура

```text
src/
  App.tsx       экран приложения и сценарии пользователя
  api.ts        запросы к учебному API и авторизация
  main.tsx      точка входа React
  styles.css    адаптивные стили интерфейса
tests/          тесты API-клиента
```

## API

Клиент подключается к учебному API `https://inai-col3.fishrungames.com/api/`. Refresh cookie использует HttpOnly; access-токен хранится в памяти приложения. Список методов и схема доступны в [документации API](https://inai-col3.fishrungames.com/api/docs/).

## Публикация на GitHub Pages

В репозитории настроен GitHub Actions workflow в `.github/workflows/pages.yml`. Он собирает проект и публикует его в GitHub Pages при push в `main`. В настройках репозитория выберите **Settings → Pages → GitHub Actions**.
