#!/bin/bash

# 设置微信开发者工具CLI路径（根据您的实际安装路径修改）
installPath="/path/to/wechat_devtools/cli"
# 设置云环境ID
envId="您的云环境ID"
# 设置项目路径
projectPath="/app/mini-program"

# 上传login登录函数
${installPath} cloud functions deploy --e ${envId} --n login --r --project ${projectPath}

# 上传payment支付函数
${installPath} cloud functions deploy --e ${envId} --n payment --r --project ${projectPath}