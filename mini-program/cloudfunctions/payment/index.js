const cloud = require('wx-server-sdk');
const { nanoid } = require('nanoid');
const tencentcloud = require("tencentcloud-sdk-nodejs");
const BdaClient = tencentcloud.bda.v20200324.Client;

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 初始化人像分割客户端
const client = new BdaClient({
  credential: {
    secretId: "AKIDeQzObaMtFPL3e3EE2f7MOHxTmvyMfmkV",
    secretKey: "e8QUKhtukLlxveEamnaCakfMuEKCVcVC",
  },
  region: "ap-shanghai",
  profile: {
    httpProfile: {
      endpoint: "bda.tencentcloudapi.com",
    },
  },
});

/**
 * 订单状态
 * 'PENDING',      -- 待支付
 * 'PAID',         -- 已支付
 * 'PROCESSING',   -- 处理中
 * 'SHIPPED',      -- 已发货
 * 'DELIVERED',    -- 已送达
 * 'COMPLETED',    -- 已完成
 * 'CANCELLED',    -- 已取消
 * 'REFUNDED'      -- 已退款
 */

const db = cloud.database();
// 订单集合 - 存储订单和照片信息
const ordersCollection = db.collection('orders');
// 用户集合 - 用于验证用户
const usersCollection = db.collection('users');

// 处理支付回调通知
async function handlePaymentCallback(event) {
  const { notifyData } = event;

  if (!notifyData || !notifyData.id) {
    return { success: false, errMsg: '无效的回调数据' };
  }

  try {
    const { id, transactionId, totalFee, resultCode, timeEnd } = notifyData;

    // 查询订单数据
    const order = await ordersCollection.doc(id).get()
      .then(res => res.data)
      .catch(() => null);

    if (!order) {
      return { success: false, errMsg: '订单不存在' };
    }

    // 验证订单金额
    if (totalFee !== Math.round(Number(order.price) * 100)) {
      return {
        success: false,
        errMsg: '订单金额不匹配',
        expected: Math.round(Number(order.price) * 100),
        received: totalFee
      };
    }

    // 更新订单状态
    const updateData = {
      status: resultCode,
      paidTime: timeEnd || db.serverDate(),
      transactionId: transactionId || '',
      updateTime: db.serverDate()
    };

    await ordersCollection.doc(id).update({ data: updateData });

    return {
      success: true,
      data: { id, status: updateData.status }
    };
  } catch (err) {
    return { success: false, errMsg: '处理支付回调失败', error: err };
  }
}

// 创建付费订单
async function createOrder(event) {
  const { orderData } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid || !orderData) {
    return { success: false, errMsg: '无效的用户信息或订单数据' };
  }

  try {
    // 生成订单ID
    const orderId = nanoid();
    // 是否需要付费
    const needPayment = orderData.productId !== 'free';

    // 构建订单对象
    const orderItem = {
      orderId,
      openid,
      productId: orderData.productId,
      productName: orderData.productName,
      price: orderData.price,
      status: needPayment ? 'PENDING' : 'PAID',
      photo: {
        fileID: orderData.photo.fileID,
        size: orderData.photo.size,
        bgColor: orderData.photo.bgColor
      },
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    // 保存订单到数据库
    const { _id: id } = await ordersCollection.add({ data: orderItem });

    return {
      success: true,
      data: { id, needPayment }
    };
  } catch (err) {
    return { success: false, errMsg: '创建订单失败', error: err };
  }
}

// 获取支付参数
async function getPayParams(event) {
  const { id } = event;
  const wxContext = cloud.getWXContext();

  if (!id) {
    return { success: false, errMsg: '订单ID不能为空' };
  }

  try {
    // 查询订单
    const order = await ordersCollection.doc(id).get()
      .then(res => res.data)
      .catch(() => null);

    if (!order) {
      return { success: false, errMsg: '订单不存在' };
    }

    // 检查是否为订单所有者
    if (order.openid !== wxContext.OPENID) {
      return { success: false, errMsg: '无权操作该订单' };
    }

    // 检查订单状态
    if (order.status !== 'PENDING') {
      return { success: false, errMsg: '只有待支付的订单才能获取支付参数' };
    }

    // 生成微信支付参数（实际环境中需接入真实支付）
    const payParams = {
      // 这里是模拟的支付参数
      timeStamp: '' + Math.floor(Date.now() / 1000),
      nonceStr: nanoid(36),
      package: `prepay_id=mock_prepay_id_${order.openid}`,
      signType: 'MD5',
      paySign: 'mock_sign'
    };

    // 模拟成功 更新订单状态
    await ordersCollection.doc(id).update({
      data: {
        status: 'COMPLETED',
        updateTime: db.serverDate()
      }
    });

    return {
      success: true,
      data: { id, payParams }
    };
  } catch (err) {
    return { success: false, errMsg: '获取支付参数失败', error: err };
  }
}

// 查询订单信息
async function queryOrder(event) {
  const { id } = event;
  const wxContext = cloud.getWXContext();

  if (!id) {
    return { success: false, errMsg: '订单ID不能为空' };
  }

  try {
    // 从数据库查询订单
    const order = await ordersCollection.doc(id).get()
      .then(res => res.data)
      .catch(() => null);

    if (!order) {
      return { success: false, errMsg: '订单不存在' };
    }

    // 检查是否为订单所有者
    if (order.openid !== wxContext.OPENID) {
      return { success: false, errMsg: '无权查看该订单' };
    }

    return {
      success: true,
      data: order
    };
  } catch (err) {
    return { success: false, errMsg: '查询订单失败', error: err };
  }
}

// 获取用户订单列表
async function getOrderList(event) {
  const { status, limit = 10, skip = 0 } = event;
  const wxContext = cloud.getWXContext();

  if (!wxContext.OPENID) {
    return { success: false, errMsg: '用户未登录' };
  }

  try {
    // 构建查询条件
    let query = ordersCollection.where({
      openid: wxContext.OPENID
    });

    // 如果指定了状态，则添加状态过滤
    if (status) {
      query = query.where({ status });
    }

    // 查询订单总数
    const total = await query.count().then(res => res.total);

    // 查询订单列表
    const orderList = await query
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get()
      .then(res => res.data);

    return {
      success: true,
      data: {
        total,
        list: orderList
      }
    };
  } catch (err) {
    return { success: false, errMsg: '获取订单列表失败', error: err };
  }
}

// 处理人像分割
async function processPortrait(event) {
  const { imageUrl } = event
  try {
    const params = {
      Url: imageUrl,
      RspImgType: "url"
    };

    const result = await client.SegmentPortraitPic(params);
    return {
      success: true,
      resultImageUrl: result.ResultImageUrl,
      resultMask: result.ResultMask
    };
  } catch (error) {
    console.error('人像分割失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 标记订单已完成
async function completeOrder(event) {
  const { id } = event;
  const wxContext = cloud.getWXContext();

  if (!id) {
    return { success: false, errMsg: '订单ID不能为空' };
  }

  try {
    // 查询订单
    const order = await ordersCollection.doc(id).get()
      .then(res => res.data)
      .catch(() => null);

    if (!order) {
      return { success: false, errMsg: '订单不存在' };
    }

    // 检查是否为订单所有者
    if (order.openid !== wxContext.OPENID) {
      return { success: false, errMsg: '无权操作该订单' };
    }

    // 检查订单状态
    if (order.status !== 'PAID') {
      return { success: false, errMsg: '只有已支付的订单才能标记为完成' };
    }

    // 更新订单状态和结果
    await ordersCollection.doc(id).update({
      data: {
        status: 'COMPLETED',
        resultImageUrl: processResult.resultImageUrl,
        resultMask: processResult.resultMask,
        completedAt: db.serverDate()
      }
    });

    return {
      success: true,
      data: {
        resultImageUrl: processResult.resultImageUrl
      }
    };
  } catch (err) {
    return { success: false, errMsg: '完成订单失败', error: err };
  }
}

// 查询订单支付状态
async function queryOrderStatus(event) {
  const { id } = event;

  if (!id) {
    return { success: false, errMsg: '订单ID不能为空' };
  }

  try {
    // 查询订单状态
    const order = await ordersCollection.doc(id).get()
      .then(res => res.data)
      .catch(() => null);

    if (!order) {
      return { success: false, errMsg: '订单不存在' };
    }

    return {
      success: true,
      data: { status: order.status }
    };
  } catch (err) {
    return { success: false, errMsg: '查询订单状态失败', error: err };
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'paymentCallback':
      return handlePaymentCallback(event);
    case 'createOrder':
      return createOrder(event);
    case 'getPayParams':
      return getPayParams(event);
    case 'queryOrder':
      return queryOrder(event);
    case 'getOrderList':
      return getOrderList(event);
    case 'processPortrait':
      return processPortrait(event)
    case 'completeOrder':
      return completeOrder(event);
    case 'queryOrderStatus':
      return queryOrderStatus(event);
    default:
      return { success: false, errMsg: '未知的操作类型' };
  }
}; 