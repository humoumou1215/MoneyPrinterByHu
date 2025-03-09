// 创建Vue应用
new Vue({
    el: '#app',
    data() {
        return {
            // 输入数据
            inputContent: '',
            submitting: false,
            showPreview: false,  // 控制预览显示
            
            // 记录数据
            records: [],
            loading: true,
            error: null,
            
            // 分页
            currentPage: 1,
            pageSize: 10,
            
            // 对话框
            editDialogVisible: false,
            detailDialogVisible: false,
            
            // 表单数据
            editForm: {
                id: null,
                content: ''
            },
            detailForm: {
                thinking_process: '',
                result: ''
            },
            
            // 更新状态
            updating: false,
            
            // 自动刷新
            refreshTimer: null,
            autoRefreshEnabled: true,
            lastRefreshTime: null,
            
            // Markdown解析器
            md: null
        }
    },
    computed: {
        // 获取当前页的记录
        paginatedRecords() {
            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            return this.records.slice(start, end);
        },
        
        // 记录总页数
        totalPages() {
            return Math.ceil(this.records.length / this.pageSize);
        },
        
        // 记录状态统计
        statusCounts() {
            const counts = {
                total: this.records.length,
                pending: 0,
                processing: 0,
                completed: 0,
                failed: 0
            };
            
            this.records.forEach(record => {
                counts[record.input_status] = (counts[record.input_status] || 0) + 1;
            });
            
            return counts;
        }
    },
    mounted() {
        // 初始化Markdown解析器
        this.initMarkdownParser();
        
        // 页面加载时获取记录
        this.loadRecords();
        
        // 设置自动刷新
        this.setupAutoRefresh();
        
        // 添加页面可见性监听
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    },
    beforeDestroy() {
        // 组件销毁前清除定时器和事件监听
        this.clearRefreshTimer();
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    },
    methods: {
        // 初始化Markdown解析器
        initMarkdownParser() {
            if (window.markdownit) {
                this.md = window.markdownit({
                    html: true,
                    linkify: true,
                    typographer: true,
                    highlight: function (str, lang) {
                        if (lang && hljs && hljs.getLanguage(lang)) {
                            try {
                                return hljs.highlight(str, { language: lang }).value;
                            } catch (__) {}
                        }
                        return ''; // 使用默认的转义
                    }
                });
            } else {
                console.warn('markdown-it 库未加载，将使用纯文本显示');
            }
        },
        
        // 渲染Markdown内容
        renderMarkdown(content) {
            if (!content) return '';
            if (this.md) {
                return this.md.render(content);
            }
            return content;
        },
        
        // 获取预览文本（纯文本，用于截断显示）
        getPreviewText(content, length = 50) {
            if (!content) return '无';
            
            // 移除Markdown标记以获得纯文本预览
            const plainText = content
                .replace(/#+\s+/g, '') // 移除标题
                .replace(/(\*\*|__)(.*?)\1/g, '$2') // 移除粗体
                .replace(/(\*|_)(.*?)\1/g, '$2') // 移除斜体
                .replace(/~~(.*?)~~/g, '$1') // 移除删除线
                .replace(/```[\s\S]*?```/g, '[代码块]') // 替换代码块
                .replace(/`([^`]+)`/g, '$1') // 移除行内代码
                .replace(/!\[(.*?)\]\(.*?\)/g, '[图片:$1]') // 替换图片
                .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 替换链接
                .replace(/^\s*[\*\-+]\s+/gm, '') // 移除列表标记
                .replace(/^\s*\d+\.\s+/gm, '') // 移除有序列表标记
                .replace(/\n/g, ' ') // 将换行替换为空格
                .replace(/\s+/g, ' ') // 合并多个空格
                .trim();
                
            return plainText.length > length ? 
                   plainText.substring(0, length) + '...' : 
                   plainText;
        },
        
        // 初始化自动刷新
        setupAutoRefresh() {
            this.clearRefreshTimer();
            
            if (this.autoRefreshEnabled) {
                this.refreshTimer = setInterval(() => {
                    // 仅在页面可见时刷新
                    if (document.visibilityState === 'visible') {
                        this.loadRecords(false); // 静默刷新
                    }
                }, 15000); // 每15秒刷新一次
            }
        },
        
        // 处理页面可见性变化
        handleVisibilityChange() {
            if (document.visibilityState === 'visible') {
                // 页面变为可见时立即刷新一次
                const now = new Date();
                // 如果上次刷新时间距离现在超过5秒，则刷新数据
                if (!this.lastRefreshTime || now - this.lastRefreshTime > 5000) {
                    this.loadRecords(false);
                }
            }
        },
        
        // 清除刷新定时器
        clearRefreshTimer() {
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
                this.refreshTimer = null;
            }
        },
        
        // 切换自动刷新
        toggleAutoRefresh() {
            this.autoRefreshEnabled = !this.autoRefreshEnabled;
            if (this.autoRefreshEnabled) {
                this.setupAutoRefresh();
                this.$message.success('自动刷新已启用');
            } else {
                this.clearRefreshTimer();
                this.$message.info('自动刷新已禁用');
            }
        },
        
        // 加载所有记录
        loadRecords(showLoading = true) {
            if (showLoading) {
                this.loading = true;
            }
            
            this.error = null;
            this.lastRefreshTime = new Date();
            
            fetch('/api/records')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    this.records = data;
                    this.loading = false;
                })
                .catch(error => {
                    console.error('加载记录失败:', error);
                    this.error = `加载记录失败: ${error.message}`;
                    this.loading = false;
                    this.$message.error(`加载记录失败: ${error.message}`);
                });
        },
        
        // 清空输入
        clearInput() {
            this.inputContent = '';
        },
        
        // 提交输入
        submitInput() {
            const content = this.inputContent.trim();
            if (!content) {
                this.$message.warning('请输入内容后再提交');
                return;
            }
            
            this.submitting = true;
            this.error = null;
            
            fetch('/api/input', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.status === 'success') {
                        this.$message.success('提交成功！系统正在处理您的输入...');
                        this.inputContent = '';
                        this.loadRecords();
                    } else {
                        throw new Error(data.error || '未知错误');
                    }
                })
                .catch(error => {
                    console.error('提交失败:', error);
                    this.error = `提交失败: ${error.message}`;
                    this.$message.error(`提交失败: ${error.message}`);
                })
                .finally(() => {
                    this.submitting = false;
                });
        },
        
        // 打开编辑对话框
        openEditDialog(row) {
            this.editForm = {
                id: row.id,
                content: row.content
            };
            this.editDialogVisible = true;
            
            // 下一轮事件循环聚焦到输入框
            this.$nextTick(() => {
                const textarea = document.querySelector('.el-dialog textarea');
                if (textarea) {
                    textarea.focus();
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                }
            });
        },
        
        // 更新输入内容
        updateInput() {
            const content = this.editForm.content.trim();
            if (!content) {
                this.$message.warning('内容不能为空');
                return;
            }
            
            this.updating = true;
            this.error = null;
            
            fetch(`/api/input/${this.editForm.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.status === 'success') {
                        this.$message.success('修改成功！系统将重新处理您的输入...');
                        this.editDialogVisible = false;
                        this.loadRecords();
                    } else {
                        throw new Error(data.error || '未知错误');
                    }
                })
                .catch(error => {
                    console.error('修改失败:', error);
                    this.error = `修改失败: ${error.message}`;
                    this.$message.error(`修改失败: ${error.message}`);
                })
                .finally(() => {
                    this.updating = false;
                });
        },
        
        // 打开详情对话框
        openDetailDialog(row) {
            this.detailForm = {
                thinking_process: row.thinking_process || '',
                result: row.result || ''
            };
            this.detailDialogVisible = true;
        },
        
        // 复制内容到剪贴板
        copyContent(text) {
            if (!text) {
                this.$message.warning('没有可复制的内容');
                return;
            }
            
            // 尝试使用现代API
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text)
                    .then(() => {
                        this.$message({
                            message: '复制成功',
                            type: 'success',
                            duration: 1500
                        });
                    })
                    .catch(err => {
                        console.error('剪贴板API失败，使用备选方法');
                        this.fallbackCopy(text);
                    });
            } else {
                // 回退方案
                this.fallbackCopy(text);
            }
        },
        
        // 备选复制方法
        fallbackCopy(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    this.$message({
                        message: '复制成功',
                        type: 'success',
                        duration: 1500
                    });
                } else {
                    this.$message.error('复制失败，请手动复制');
                }
            } catch (err) {
                this.$message.error('复制失败: ' + err);
            } finally {
                document.body.removeChild(textarea);
            }
        },
        
        // 分页大小变化
        handleSizeChange(size) {
            this.pageSize = size;
            this.currentPage = 1;
        },
        
        // 当前页变化
        handleCurrentChange(page) {
            this.currentPage = page;
        },
        
        // 获取状态文本
        getStatusText(status) {
            const statusMap = {
                'pending': '待处理',
                'processed': '已处理',
                'processing': '处理中',
                'completed': '已完成',
                'error': '错误'
            };
            
            return statusMap[status] || status;
        },
        
        // 获取状态类型（Element UI的Tag组件类型）
        getStatusType(status) {
            const typeMap = {
                'pending': 'warning',
                'processed': 'success',
                'processing': 'info',
                'completed': 'success',
                'error': 'danger'
            };
            
            return typeMap[status] || '';
        },
        
        // 格式化日期时间
        formatDateTime(dateTimeStr) {
            if (!dateTimeStr) return '未知';
            
            // 尝试解析ISO格式日期
            try {
                const date = new Date(dateTimeStr);
                
                // 返回格式化的日期和时间
                return date.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            } catch (e) {
                return dateTimeStr;  // 如果解析失败，返回原始字符串
            }
        },
        
        // 处理快捷键
        handleKeydown(event) {
            // Alt + Enter 提交
            if (event.altKey && event.key === 'Enter') {
                event.preventDefault();
                this.submitInput();
            }
        },
        
        // 切换预览
        togglePreview() {
            this.showPreview = !this.showPreview;
        }
    },
    template: `
        <el-container>
            <el-header>
                <div class="header-content">
                    <div class="logo">
                        <i class="fas fa-brain"></i>
                        <h1>阿里百炼大模型思考记录</h1>
                    </div>
                    <div class="controls">
                        <el-tooltip content="切换自动刷新" placement="bottom">
                            <el-button 
                                size="small" 
                                :type="autoRefreshEnabled ? 'success' : 'info'"
                                icon="el-icon-refresh"
                                circle
                                @click="toggleAutoRefresh">
                            </el-button>
                        </el-tooltip>
                        <span class="last-update" v-if="lastRefreshTime">
                            最后更新: {{ formatDateTime(lastRefreshTime) }}
                        </span>
                    </div>
                </div>
            </el-header>
            
            <el-main>
                <!-- 错误提示区 -->
                <el-alert
                    v-if="error"
                    :title="error"
                    type="error"
                    :closable="true"
                    show-icon
                    @close="error = null"
                    style="margin-bottom: 15px;">
                </el-alert>
                
                <!-- 状态统计 -->
                <el-row :gutter="20" v-if="records.length > 0" class="stats-row">
                    <el-col :span="4">
                        <el-card shadow="hover" class="stat-card">
                            <div class="stat-item">
                                <div class="stat-title">总记录</div>
                                <div class="stat-value">{{ statusCounts.total }}</div>
                            </div>
                        </el-card>
                    </el-col>
                    <el-col :span="5">
                        <el-card shadow="hover" class="stat-card pending">
                            <div class="stat-item">
                                <div class="stat-title">待处理</div>
                                <div class="stat-value">{{ statusCounts.pending || 0 }}</div>
                            </div>
                        </el-card>
                    </el-col>
                    <el-col :span="5">
                        <el-card shadow="hover" class="stat-card processing">
                            <div class="stat-item">
                                <div class="stat-title">处理中</div>
                                <div class="stat-value">{{ statusCounts.processing || 0 }}</div>
                            </div>
                        </el-card>
                    </el-col>
                    <el-col :span="5">
                        <el-card shadow="hover" class="stat-card completed">
                            <div class="stat-item">
                                <div class="stat-title">已完成</div>
                                <div class="stat-value">{{ statusCounts.completed || 0 }}</div>
                            </div>
                        </el-card>
                    </el-col>
                    <el-col :span="5">
                        <el-card shadow="hover" class="stat-card failed">
                            <div class="stat-item">
                                <div class="stat-title">失败</div>
                                <div class="stat-value">{{ statusCounts.failed || 0 }}</div>
                            </div>
                        </el-card>
                    </el-col>
                </el-row>
                
                <!-- 输入卡片 -->
                <el-card class="input-card">
                    <div slot="header">
                        <div class="card-header">
                            <div>
                                <i class="fas fa-edit"></i>
                                <span>新建用户输入</span>
                            </div>
                            <el-button 
                                size="small"
                                :type="showPreview ? 'primary' : 'default'"
                                @click="togglePreview">
                                <i class="fas fa-eye"></i>
                                {{ showPreview ? '隐藏预览' : '显示预览' }}
                            </el-button>
                        </div>
                    </div>
                    <el-form @submit.native.prevent="submitInput">
                        <el-row :gutter="20">
                            <el-col :span="showPreview ? 12 : 24">
                                <el-form-item label="输入内容">
                                    <el-input
                                        type="textarea"
                                        :rows="8"
                                        placeholder="在这里输入您的问题或提示...&#10;支持Markdown格式&#10;使用Alt+Enter快捷键提交"
                                        v-model="inputContent"
                                        @keydown="handleKeydown">
                                    </el-input>
                                    <div class="el-form-item__info">
                                        <i class="fas fa-info-circle"></i> 
                                        支持Markdown格式，使用Alt+Enter快捷键提交。输入内容后，系统将自动调用阿里百炼大模型进行思考
                                    </div>
                                </el-form-item>
                            </el-col>
                            <el-col :span="12" v-if="showPreview">
                                <el-form-item label="预览">
                                    <div class="markdown-preview markdown-content" v-html="renderMarkdown(inputContent || '暂无内容')"></div>
                                </el-form-item>
                            </el-col>
                        </el-row>
                        <el-form-item class="text-right">
                            <el-button @click="clearInput" plain>
                                <i class="fas fa-undo"></i> 清空
                            </el-button>
                            <el-button type="primary" native-type="submit" :loading="submitting">
                                <i class="fas fa-paper-plane"></i> 提交
                            </el-button>
                        </el-form-item>
                    </el-form>
                </el-card>
                
                <!-- 历史记录部分 -->
                <el-card class="records-card">
                    <div slot="header">
                        <div class="card-header">
                            <div>
                                <i class="fas fa-history"></i>
                                <span>历史记录</span>
                            </div>
                            <el-button size="small" icon="el-icon-refresh" @click="loadRecords" :loading="loading">
                                刷新
                            </el-button>
                        </div>
                    </div>
                    
                    <div v-if="loading" class="loading-container">
                        <el-skeleton animated :rows="6" />
                    </div>
                    
                    <div v-else-if="records.length === 0" class="no-data">
                        <i class="fas fa-info-circle"></i>
                        <p>暂无记录，请提交一个新的输入</p>
                    </div>
                    
                    <el-table
                        v-else
                        :data="paginatedRecords"
                        style="width: 100%"
                        border
                        stripe
                        :default-sort="{prop: 'id', order: 'descending'}"
                        row-key="id">
                        <el-table-column prop="id" label="ID" width="80" sortable></el-table-column>
                        <el-table-column prop="content" label="输入内容" min-width="200">
                            <template slot-scope="scope">
                                <div @dblclick="openEditDialog(scope.row)" class="content-cell">
                                    {{ scope.row.content }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column prop="input_status" label="状态" width="150">
                            <template slot-scope="scope">
                                <div class="status-column">
                                    <el-tag :type="getStatusType(scope.row.input_status)">
                                        {{ getStatusText(scope.row.input_status) }}
                                    </el-tag>
                                    <el-button 
                                        v-if="scope.row.input_status === 'pending' || scope.row.response_status === 'processing'"
                                        size="mini" 
                                        circle 
                                        icon="el-icon-refresh" 
                                        @click="loadRecords">
                                    </el-button>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column prop="thinking_process" label="思考过程" min-width="150">
                            <template slot-scope="scope">
                                <el-popover
                                    v-if="scope.row.thinking_process"
                                    placement="top-start"
                                    width="500"
                                    trigger="hover"
                                    popper-class="markdown-popover">
                                    <div class="markdown-content" v-html="renderMarkdown(scope.row.thinking_process)"></div>
                                    <div slot="reference" class="truncated-text">
                                        {{ getPreviewText(scope.row.thinking_process, 50) }}
                                    </div>
                                </el-popover>
                                <span v-else>无</span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="result" label="思考结果" min-width="150">
                            <template slot-scope="scope">
                                <el-popover
                                    v-if="scope.row.result"
                                    placement="top-start"
                                    width="500"
                                    trigger="hover"
                                    popper-class="markdown-popover">
                                    <div class="markdown-content" v-html="renderMarkdown(scope.row.result)"></div>
                                    <div slot="reference" class="truncated-text">
                                        {{ getPreviewText(scope.row.result, 50) }}
                                    </div>
                                </el-popover>
                                <span v-else>无</span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="created_at" label="创建时间" width="180" sortable>
                            <template slot-scope="scope">
                                {{ formatDateTime(scope.row.created_at) }}
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="170" fixed="right">
                            <template slot-scope="scope">
                                <el-button 
                                    type="primary" 
                                    size="small" 
                                    icon="el-icon-edit" 
                                    @click="openEditDialog(scope.row)">
                                    编辑
                                </el-button>
                                <el-button 
                                    v-if="scope.row.thinking_process || scope.row.result"
                                    type="info" 
                                    size="small" 
                                    icon="el-icon-view" 
                                    @click="openDetailDialog(scope.row)">
                                    详情
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                    
                    <el-pagination
                        v-if="records.length > 0"
                        class="pagination"
                        @size-change="handleSizeChange"
                        @current-change="handleCurrentChange"
                        :current-page="currentPage"
                        :page-sizes="[5, 10, 20, 50]"
                        :page-size="pageSize"
                        layout="total, sizes, prev, pager, next, jumper"
                        :total="records.length">
                    </el-pagination>
                </el-card>
            </el-main>
            
            <!-- 修改输入的对话框 -->
            <el-dialog
                title="修改输入"
                :visible.sync="editDialogVisible"
                width="50%"
                :close-on-click-modal="false">
                <el-form>
                    <el-form-item label="输入内容">
                        <el-input
                            type="textarea"
                            :rows="6"
                            placeholder="请输入内容"
                            v-model="editForm.content">
                        </el-input>
                        <div class="el-form-item__info">
                            <i class="fas fa-info-circle"></i> 修改内容后，系统将重新调用大模型进行思考
                        </div>
                    </el-form-item>
                </el-form>
                <span slot="footer" class="dialog-footer">
                    <el-button @click="editDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="updateInput" :loading="updating">保存修改</el-button>
                </span>
            </el-dialog>
            
            <!-- 查看详情的对话框 -->
            <el-dialog
                title="详细信息"
                :visible.sync="detailDialogVisible"
                width="70%">
                <div class="detail-thinking">
                    <div class="detail-header">
                        <h4><i class="fas fa-cogs"></i> 思考过程：</h4>
                        <el-button 
                            size="mini" 
                            icon="el-icon-document-copy"
                            @click="copyContent(detailForm.thinking_process)">
                            复制
                        </el-button>
                    </div>
                    <div class="detail-content markdown-content" v-html="renderMarkdown(detailForm.thinking_process || '暂无思考过程')"></div>
                </div>
                <div class="detail-result">
                    <div class="detail-header">
                        <h4><i class="fas fa-lightbulb"></i> 思考结果：</h4>
                        <el-button 
                            size="mini" 
                            icon="el-icon-document-copy"
                            @click="copyContent(detailForm.result)">
                            复制
                        </el-button>
                    </div>
                    <div class="detail-content markdown-content" v-html="renderMarkdown(detailForm.result || '暂无结果')"></div>
                </div>
            </el-dialog>
        </el-container>
    `
}); 