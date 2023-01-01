#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../lib/application-infrastructure-construct';
import {getContextOrError} from "../lib/helpers";

const app = new cdk.App();

const appName = getContextOrError(app, "appName");
const account = getContextOrError(app, "account");
const region = getContextOrError(app, "region");
const environment = getContextOrError(app, "environment");

new InfrastructureStack(app, `deployment-${appName}-${environment}`, {
  env: {
    account: account,
    region: region
  }
});