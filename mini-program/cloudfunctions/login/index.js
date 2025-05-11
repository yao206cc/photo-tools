const cloud = require('wx-server-sdk');
const { nanoid } = require('nanoid');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const userCollection = db.collection('users');

// 登录云函数入口函数
exports.main = async (event, context) => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const unionid  = wxContext.UNIONID;

  if (!openid) {
    return {
      success: false,
      code: 401,
      message: '获取用户openid失败'
    };
  }

  try {
    // 查询用户是否已存在
    const userRecord = await userCollection.where({
      openid: openid
    }).get();

    // 用户信息
    let userData = null;

    // 如果用户不存在则创建新用户
    if (userRecord.data.length === 0) {
      // 获取传入的用户信息
      const { userInfo } = event;

      // 生成简短的用户ID
      const userId = nanoid(8);

      // 用户信息对象 - 只保留必要字段
      const newUser = {
        userId,
        openid,
        unionid,
        createTime: db.serverDate(),
        lastLoginTime: db.serverDate(),
        // 只保存必要的用户信息字段
        nickName: userInfo?.nickName || '微信用户',
        avatarUrl: userInfo?.avatarUrl || '',
      };

      // 创建新用户
      const result = await userCollection.add({
        data: newUser
      });

      if (result._id) {
        userData = newUser;
        userData._id = result._id;
      }
    } else {
      // 用户已存在，更新登录时间和可能变化的用户信息
      userData = userRecord.data[0];

      // 如果没有userId字段，为旧用户添加
      if (!userData.userId) {
        userData.userId = nanoid(8);
      }

      // 更新数据
      const updateData = {
        lastLoginTime: db.serverDate()
      };

      // 更新userId（如果是旧用户）
      if (!userData.userId) {
        updateData.userId = userData.userId;
      }

      // 如果有新的用户信息，则更新关键字段
      if (event.userInfo) {
        if (event.userInfo.nickName) {
          updateData.nickName = event.userInfo.nickName;
        }
        if (event.userInfo.avatarUrl) {
          updateData.avatarUrl = event.userInfo.avatarUrl;
        }
      }

      await userCollection.doc(userData._id).update({
        data: updateData
      });

      // 更新返回的数据
      if (updateData.nickName) {
        userData.nickName = updateData.nickName;
      }
      if (updateData.avatarUrl) {
        userData.avatarUrl = updateData.avatarUrl;
      }
    }

    // 添加备注：关于微信用户昵称获取的问题
    // 注意：微信于2021年后更新了隐私政策，小程序默认获取的昵称会显示为"微信用户"
    // 要获取真实昵称，必须使用button组件的open-type="getUserInfo"或getUserProfile API
    // 并且用户必须主动授权才能获取真实昵称

    return {
      success: true,
      code: 200,
      data: {
        openid,
        userData: {
          userId: userData.userId,
          nickName: userData.nickName || '微信用户',
          avatarUrl: userData.avatarUrl || ''
        }
      },
      message: '登录成功'
    };
  } catch (error) {
    console.error('登录失败', error);
    return {
      success: false,
      code: 500,
      message: '登录失败: ' + error.message
    };
  }
}; 