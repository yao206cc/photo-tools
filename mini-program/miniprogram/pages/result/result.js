// 引入TDesign组件
import Toast from 'tdesign-miniprogram/toast/index';
import { storageApi, paymentApi, userApi } from '../../utils/cloudApi';

Page({
  data: {
    photoUrl: '', // 处理后的图片URL
    originalFileID: '', // 原图fileID
    photoSize: {},
    backgroundColor: '#ffffff', // 默认背景色为白色
    aspectRatio: '3/4',  // 默认宽高比
    isPaid: false,
    complianceStatus: {
      passed: true,
      warnings: 0
    },
    showPaymentSuccess: false,
    isLoading: false,
    // 登录相关
    isLoggedIn: false, // 是否已登录
    userInfo: null,    // 用户信息
    openid: '',        // 用户唯一标识
    id: '',       // 当前订单ID
    photoId: '',       // 照片ID
    canvasWidth: 0,  // 画布宽度
    canvasHeight: 0, // 画布高度
    // 版本选择相关数据
    versions: [
      {
        id: 'free',
        title: '免费版',
        tag: '免费',
        desc: '基础电子版照片，含水印',
        price: '0',
        features: [
          { text: '标准尺寸照片', available: true },
          { text: '电子版使用', available: true },
          { text: '含水印', available: true },
          { text: '高清无水印', available: false },
          { text: '证件照打印', available: false }
        ]
      },
      {
        id: 'premium',
        title: '高级版',
        tag: '推荐',
        desc: '高清无水印照片，可用于证件办理',
        price: '5',
        features: [
          { text: '标准尺寸照片', available: true },
          { text: '电子版使用', available: true },
          { text: '高清无水印', available: true },
          { text: '证件照打印', available: true },
          { text: '一键换底色', available: false }
        ]
      },
      {
        id: 'pro',
        title: '专业版',
        tag: 'VIP',
        desc: '专业级照片，所有高级功能',
        price: '9.9',
        features: [
          { text: '标准尺寸照片', available: true },
          { text: '电子版使用', available: true },
          { text: '高清无水印', available: true },
          { text: '证件照打印', available: true },
          { text: '一键换底色', available: true },
          { text: '免费云存储', available: true }
        ]
      }
    ],
    currentVersionIndex: 0,
  },

  onLoad(options) {
    if (options.photoUrl) {
      // 解析宽高数据，确保是数字格式
      let width = options.width || '295';
      let height = options.height || '413';

      // 移除可能的单位后缀
      width = width.replace(/px|rpx/g, '');
      height = height.replace(/px|rpx/g, '');

      // 计算宽高比
      let aspectRatio = '3/4'; // 默认值
      if (width && height) {
        const widthNum = Number(width);
        const heightNum = Number(height);
        if (!isNaN(widthNum) && !isNaN(heightNum) && heightNum !== 0) {
          aspectRatio = widthNum / heightNum;
        }
      }

      const photoUrl = decodeURIComponent(options.photoUrl);
      const originalFileID = decodeURIComponent(options.originalFileID || '');

      // 计算画布尺寸
      const canvasWidth = Number(width);
      const canvasHeight = Number(height);
      
      this.setData({
        photoUrl,
        originalFileID,
        photoSize: {
          name: options.sizeName || '一寸照片',
          width: width,
          height: height,
          physical: options.physical || '25mm×35mm'
        },
        aspectRatio,
        backgroundColor: options.backgroundColor || '#ffffff',
        canvasWidth,
        canvasHeight,
        complianceStatus: {
          passed: options.compliancePassed === 'true',
          warnings: parseInt(options.warnings || '0')
        }
      }, () => {
        // 初始化画布并合成图片
        this.initCanvas();
      });

      // 检查用户是否已登录
      this.checkLoginStatus();
    } else {
      // 没有照片数据，返回上一页
      Toast({
        context: this,
        selector: '#t-toast',
        message: '照片数据不完整，请重新编辑',
        theme: 'error',
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 检查用户登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const openid = wx.getStorageSync('openid');

    if (userInfo?.nickName && openid) {
      this.setData({
        isLoggedIn: true,
        userInfo,
        openid
      });
    }
  },

  // 获取用户信息并登录
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于保存照片和个人账号关联',
      success: (res) => {
        // 获取用户信息成功，调用登录方法并传递用户信息
        this.doLogin(res.userInfo);
      },
      fail: (err) => {
        console.error('获取用户信息失败', err);
        Toast({
          context: this,
          selector: '#t-toast',
          message: '获取用户信息失败',
          theme: 'error'
        });

        // 使用基础登录（不带用户信息）
        this.doLogin();
      }
    });
  },

  // 统一的登录处理方法
  doLogin(userInfo = null) {
    this.setData({ isLoading: true });

    // 使用cloudApi中的userApi调用登录
    userApi.login(userInfo)
      .then(result => {
        if (result.success) {
          // 登录成功
          const { openid, userData } = result.data;
          // 保存用户信息到本地
          wx.setStorageSync('openid', openid);
          wx.setStorageSync('userInfo', userInfo || (userData ? userData : {}));

          // 更新页面状态
          this.setData({
            isLoggedIn: true,
            userInfo: userInfo || (userData ? userData : {}),
            openid,
            isLoading: false
          });

          Toast({
            context: this,
            selector: '#t-toast',
            message: '登录成功'
          });

          // 执行登录后的操作
          this.handlePostLogin();
        } else {
          throw new Error('登录失败: ' + (result.errMsg || '未知错误'));
        }
      })
      .catch(err => {
        console.error('登录失败', err);
        this.setData({ isLoading: false });
        Toast({
          context: this,
          selector: '#t-toast',
          message: '登录失败，请重试',
          theme: 'error'
        });
      });
  },

  // 登录成功后的操作
  handlePostLogin() {
    // 获取当前版本类型并执行操作
    const currentVersion = this.data.versions[this.data.currentVersionIndex];
    this.createOrder(currentVersion.id, currentVersion.price);
  },

  // 切换版本
  changeVersion(e) {
    this.setData({
      currentVersionIndex: e.currentTarget.dataset.index
    });
  },

  // 版本滑动改变
  versionChange(e) {
    this.setData({
      currentVersionIndex: e.detail.current
    });
  },

  // 下载或购买照片（根据当前选择的版本）
  handleVersionAction() {
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '请先登录',
        content: '登录后才能使用此功能',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            this.getUserProfile();
          }
        }
      });
      return;
    }

    // 已登录，创建订单
    const currentVersion = this.data.versions[this.data.currentVersionIndex];
    this.createOrder(currentVersion.id, currentVersion.price);
  },

  // 统一创建订单
  createOrder(versionId, price) {
    this.setData({ isLoading: true });

    // 准备订单数据
    const orderData = {
      productId: versionId,
      productName: this.data.versions.find(v => v.id === versionId).title,
      price,
      photo: {
        originalFileID: this.data.originalFileID,
        processedUrl: this.data.photoUrl,
        size: {
          width: this.data.photoSize.width,
          height: this.data.photoSize.height
        },
        bgColor: this.data.backgroundColor
      }
    };

    // 创建订单
    paymentApi.createOrder(orderData)
      .then(result => {
        if (result.success) {
          const { id, needPayment } = result.data;

          // 保存订单ID
          this.setData({ id });

          if (needPayment) {
            // 需要支付，调起支付
            paymentApi.getPayParams(id)
              .then(result => {
                if (result.success) {
                  const { payParams } = result.data;
                  this.processPayment(payParams, id);
                } else {
                  this.handleOrderError('获取支付参数失败: ' + (result.errMsg || '未知错误'));
                }
              }).catch(err => {
                console.error('获取支付参数失败', err);
                this.handleOrderError('获取支付参数失败');
              });
          } else {
            // 免费版本，直接处理成功
            this.handleOrderSuccess(id);
          }
        } else {
          this.handleOrderError('创建订单失败: ' + (result.errMsg || '未知错误'));
        }
      })
      .catch(err => {
        console.error('创建订单失败', err);
        this.handleOrderError('创建订单失败，请重试');
      });
  },

  // 处理支付流程
  processPayment(payParams, id) {
    // 显示模拟支付界面
    wx.showModal({
      title: '模拟支付',
      content: `将支付 ${this.data.versions[this.data.currentVersionIndex].price} 元购买${this.data.versions[this.data.currentVersionIndex].title}，是否确认？`,
      confirmText: '确认支付',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 用户确认支付，模拟支付过程
          // 模拟支付完成
          setTimeout(() => {
            this.queryOrderStatus(id);
          }, 1500);
        } else {
          // 用户取消支付
          this.setData({ isLoading: false });
          Toast({
            context: this,
            selector: '#t-toast',
            message: '支付已取消',
            theme: 'warning'
          });
        }
      }
    });
  },

  // 轮询查询订单状态是否完成
  queryOrderStatus(id) {
    paymentApi.queryOrderStatus(id)
      .then(result => {
        wx.hideLoading();
        if (result.success && result.data.status === 'COMPLETED') {
          this.handleOrderSuccess(id);
        } else {
          this.queryOrderStatus(id);
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('完成支付失败', err);
        this.handleOrderError('支付失败，请重试');
      });
  },

  // 处理订单错误
  handleOrderError(message) {
    this.setData({ isLoading: false });
    Toast({
      context: this,
      selector: '#t-toast',
      message,
      theme: 'error'
    });
  },

  // 处理订单成功
  handleOrderSuccess(id) {
    this.setData({
      isLoading: false,
      isPaid: true
    });

    // 如果是付费版本，显示支付成功对话框
    if (this.data.versions[this.data.currentVersionIndex].id !== 'free') {
      this.setData({ showPaymentSuccess: true });
    }

    // 重新渲染画布并下载合成后的图片
    this.renderAndDownloadImage(id);
  },

  // 渲染并下载图片
  renderAndDownloadImage(orderId) {
    this.setData({ isLoading: true });

    const query = wx.createSelectorQuery();
    query.select('#photoCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // 获取画布容器的实际尺寸
        const containerWidth = res[0].width;
        const containerHeight = res[0].height;

        // 设置画布尺寸为容器的实际尺寸
        canvas.width = containerWidth;
        canvas.height = containerHeight;

        // 绘制背景色
        ctx.fillStyle = this.data.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 加载人像图片
        const img = canvas.createImage();
        img.onload = () => {
          // 计算图片在画布中的位置和尺寸
          // 保持图片的宽高比，并确保底部对齐
          const scale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
          );
          
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          
          // 水平居中，底部对齐
          const x = (canvas.width - scaledWidth) / 2;
          const y = canvas.height - scaledHeight;

          // 绘制人像
          ctx.drawImage(
            img,
            x, y,
            scaledWidth,
            scaledHeight
          );

          // 如果是免费版本，添加水印
          if (!this.data.isPaid) {
            this.addWatermark(ctx, canvas.width, canvas.height);
          }

          // 导出画布图片并保存
          wx.canvasToTempFilePath({
            canvas,
            success: (res) => {
              // 上传到云存储
              storageApi.uploadImage(res.tempFilePath)
                .then(result => {
                  if (!result.success) {
                    throw new Error('保存图片失败');
                  }

                  // 保存到相册
                  return wx.saveImageToPhotosAlbum({
                    filePath: res.tempFilePath
                  });
                })
                .then(() => {
                  this.setData({ isLoading: false });
                  Toast({
                    context: this,
                    selector: '#t-toast',
                    message: '照片已保存到相册'
                  });
                })
                .catch(err => {
                  this.setData({ isLoading: false });
                  console.error('保存图片失败', err);

                  if (err.errMsg && err.errMsg.indexOf('auth deny') >= 0) {
                    Toast({
                      context: this,
                      selector: '#t-toast',
                      message: '请授权保存图片到相册',
                      theme: 'error',
                    });
                    this.openAuthSetting();
                  } else {
                    Toast({
                      context: this,
                      selector: '#t-toast',
                      message: err.message || '保存失败，请重试',
                      theme: 'error',
                    });
                  }
                });
            },
            fail: (err) => {
              this.setData({ isLoading: false });
              console.error('导出图片失败', err);
              Toast({
                context: this,
                selector: '#t-toast',
                message: '生成图片失败，请重试',
                theme: 'error',
              });
            }
          });
        };

        img.onerror = (err) => {
          this.setData({ isLoading: false });
          console.error('加载图片失败', err);
          Toast({
            context: this,
            selector: '#t-toast',
            message: '加载图片失败，请重试',
            theme: 'error',
          });
        };

        img.src = this.data.photoUrl;
      });
  },

  // 添加水印
  addWatermark(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('示例水印', width / 2, height / 2);
    ctx.restore();
  },

  // 初始化画布并合成图片
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#photoCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // 获取画布容器的实际尺寸
        const containerWidth = res[0].width;
        const containerHeight = res[0].height;

        // 设置画布尺寸为容器的实际尺寸
        canvas.width = containerWidth;
        canvas.height = containerHeight;

        // 绘制背景色
        ctx.fillStyle = this.data.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 加载人像图片
        const img = canvas.createImage();
        img.onload = () => {
          // 计算图片在画布中的位置和尺寸
          // 保持图片的宽高比，并确保底部对齐
          const scale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
          );
          
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          
          // 水平居中，底部对齐
          const x = (canvas.width - scaledWidth) / 2;
          const y = canvas.height - scaledHeight;

          // 绘制人像
          ctx.drawImage(
            img,
            x, y,
            scaledWidth,
            scaledHeight
          );

          // 如果是免费版本，添加水印
          if (!this.data.isPaid) {
            this.addWatermark(ctx, canvas.width, canvas.height);
          }

          // 导出图片
          this.exportCanvasImage(canvas);
        };

        img.onerror = (err) => {
          console.error('加载图片失败', err);
          Toast({
            context: this,
            selector: '#t-toast',
            message: '加载图片失败，请重试',
            theme: 'error',
          });
        };

        img.src = this.data.photoUrl;
      });
  },

  // 导出画布图片
  exportCanvasImage(canvas) {
    wx.canvasToTempFilePath({
      canvas,
      success: (res) => {
        this.setData({
          finalImagePath: res.tempFilePath
        });
      },
      fail: (err) => {
        console.error('导出图片失败', err);
        Toast({
          context: this,
          selector: '#t-toast',
          message: '生成图片失败，请重试',
          theme: 'error',
        });
      }
    });
  },

  // 关闭支付成功对话框
  closePaymentDialog() {
    this.setData({ showPaymentSuccess: false });
  },

  // 返回编辑页面
  goBackToEdit() {
    wx.navigateBack();
  },

  // 打开授权设置页面
  openAuthSetting() {
    wx.openSetting({
      success(res) {
        console.log('设置结果', res.authSetting);
      }
    });
  },

  // 前往首页
  goToHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  // 分享照片
  onShareAppMessage() {
    return {
      title: '我用智能证件照制作了一张完美证件照',
      path: '/pages/index/index',
      imageUrl: this.data.originalFileID
    };
  }
}); 