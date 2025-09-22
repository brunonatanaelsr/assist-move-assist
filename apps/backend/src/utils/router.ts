const express = require('express');
import type { Router as ExpressRouter } from 'express-serve-static-core';

export function createRouter() {
  return express.Router;
}

export function createRouterInstance() {
  return express.Router();
}
