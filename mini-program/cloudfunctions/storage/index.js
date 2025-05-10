const cloud = require('wx-server-sdk');
const { nanoid } = require('nanoid');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 获取文件信息的公共方法
async function getFileInfo(fileID) {
  try {
    const result = await cloud.getTempFileURL({
      fileList: [fileID],
    });
    if (result.fileList && result.fileList.length > 0) {
      return {
        success: true,
        data: result.fileList[0]
      };
    } else {
      return {
        success: false,
        errMsg: '获取文件信息失败',
      };
    }
  } catch (error) {
    console.error('获取文件信息失败', error);
    return {
      success: false,
      errMsg: '获取文件信息失败: ' + error.message,
    };
  }
}

// 上传图片函数
async function uploadImage(event) {
  const { base64Data, path } = event;
  const openid = cloud.getWXContext().OPENID;

  try {
    if (!base64Data && !path) {
      return {
        success: false,
        errMsg: '缺少图片数据',
      };
    }

    let fileID;

    // 生成云存储路径
    const storagePath = `photos/${openid}/${Date.now()}-${nanoid(12)}.jpg`;

    if (base64Data) {
      // 处理Base64数据
      if (!base64Data.startsWith('data:image')) {
        return {
          success: false,
          errMsg: '无效的Base64图片数据',
        };
      }

      // 从Base64数据中提取图片数据
      const base64 = base64Data.split(',')[1];
      const buffer = Buffer.from(base64, 'base64');

      // 上传到云存储
      const result = await cloud.uploadFile({
        cloudPath: storagePath,
        fileContent: buffer,
      });

      fileID = result.fileID;
    } else if (path) {
      // 这个分支在云函数中通常不会被触发，因为云函数无法直接访问小程序的临时文件
      // 但保留此代码以支持可能的未来扩展
      return {
        success: false,
        errMsg: '云函数不支持直接上传临时文件路径，请使用base64Data',
      };
    }

    // 获取临时URL
    const fileInfo = await getFileInfo(fileID);

    return {
      success: true,
      data: {
        fileID,
        tempFileURL: fileInfo.success ? fileInfo.data.tempFileURL : '',
      },
    };
  } catch (error) {
    console.error('上传图片失败', error);
    return {
      success: false,
      errMsg: '上传图片失败: ' + error.message,
    };
  }
}

// 获取临时URL函数
async function getTempURL(event) {
  const { fileList } = event;

  if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
    return {
      success: false,
      errMsg: '文件ID列表不能为空',
    };
  }

  try {
    const result = await cloud.getTempFileURL({
      fileList,
    });

    return {
      success: true,
      data: result.fileList,
    };
  } catch (error) {
    console.error('获取临时URL失败', error);
    return {
      success: false,
      errMsg: '获取临时URL失败: ' + error.message,
    };
  }
}

// 删除文件函数
async function deleteFile(event) {
  const { fileList } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
    return {
      success: false,
      errMsg: '文件ID列表不能为空',
    };
  }

  try {
    // 只允许删除用户自己的文件
    const safeFileList = [];

    for (const fileID of fileList) {
      // 检查文件路径是否包含用户的openid
      if (fileID.includes(`photos/${openid}/`)) {
        safeFileList.push(fileID);
      }
    }

    if (safeFileList.length === 0) {
      return {
        success: false,
        errMsg: '没有权限删除这些文件',
      };
    }

    const result = await cloud.deleteFile({
      fileList: safeFileList,
    });

    return {
      success: true,
      data: result.fileList,
    };
  } catch (error) {
    console.error('删除文件失败', error);
    return {
      success: false,
      errMsg: '删除文件失败: ' + error.message,
    };
  }
}

// 图片处理函数
async function processImage(event) {
  const { fileID, operations } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!fileID) {
    return {
      success: false,
      errMsg: '文件ID不能为空',
    };
  }

  try {
    // 此处应该实现实际的图片处理逻辑
    // 例如使用云函数的图像处理能力或调用第三方服务

    // 为了演示，这里只返回原始文件ID
    // 实际实现中，应该处理图片并上传处理后的图片

    return {
      success: true,
      data: {
        originalFileID: fileID,
        processedFileID: fileID, // 实际应该是处理后的新文件ID
      },
    };
  } catch (error) {
    console.error('图片处理失败', error);
    return {
      success: false,
      errMsg: '图片处理失败: ' + error.message,
    };
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'uploadImage':
      return await uploadImage(event);
    case 'getTempURL':
      return await getTempURL(event);
    case 'deleteFile':
      return await deleteFile(event);
    case 'processImage':
      return await processImage(event);
    default:
      return {
        success: false,
        errMsg: '未知的操作类型',
      };
  }
}; 