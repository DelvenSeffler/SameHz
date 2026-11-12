<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frm_coursesbydept_a220564
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()> _
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()> _
    Private Sub InitializeComponent()
        Me.lbl_title = New System.Windows.Forms.Label()
        Me.lbl_dept = New System.Windows.Forms.Label()
        Me.cmb_dept = New System.Windows.Forms.ComboBox()
        Me.grd_courses = New System.Windows.Forms.DataGridView()
        Me.btn_back = New System.Windows.Forms.Button()
        CType(Me.grd_courses, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'lbl_title
        '
        Me.lbl_title.AutoSize = True
        Me.lbl_title.Font = New System.Drawing.Font("Segoe UI", 20.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbl_title.Location = New System.Drawing.Point(24, 18)
        Me.lbl_title.Name = "lbl_title"
        Me.lbl_title.Size = New System.Drawing.Size(332, 37)
        Me.lbl_title.TabIndex = 0
        Me.lbl_title.Text = "Courses by Department"
        '
        'lbl_dept
        '
        Me.lbl_dept.AutoSize = True
        Me.lbl_dept.Font = New System.Drawing.Font("Segoe UI", 10.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbl_dept.Location = New System.Drawing.Point(26, 78)
        Me.lbl_dept.Name = "lbl_dept"
        Me.lbl_dept.Size = New System.Drawing.Size(90, 19)
        Me.lbl_dept.TabIndex = 1
        Me.lbl_dept.Text = "Department :"
        '
        'cmb_dept
        '
        Me.cmb_dept.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.cmb_dept.Font = New System.Drawing.Font("Segoe UI", 10.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.cmb_dept.FormattingEnabled = True
        Me.cmb_dept.Location = New System.Drawing.Point(130, 75)
        Me.cmb_dept.Name = "cmb_dept"
        Me.cmb_dept.Size = New System.Drawing.Size(180, 25)
        Me.cmb_dept.TabIndex = 2
        '
        'grd_courses
        '
        Me.grd_courses.AllowUserToAddRows = False
        Me.grd_courses.AllowUserToDeleteRows = False
        Me.grd_courses.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.AllCells
        Me.grd_courses.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize
        Me.grd_courses.Location = New System.Drawing.Point(24, 120)
        Me.grd_courses.MultiSelect = False
        Me.grd_courses.Name = "grd_courses"
        Me.grd_courses.ReadOnly = True
        Me.grd_courses.RowHeadersVisible = False
        Me.grd_courses.RowTemplate.Height = 27
        Me.grd_courses.SelectionMode = System.Windows.Forms.DataGridViewSelectionMode.FullRowSelect
        Me.grd_courses.Size = New System.Drawing.Size(840, 290)
        Me.grd_courses.TabIndex = 3
        '
        'btn_back
        '
        Me.btn_back.Location = New System.Drawing.Point(24, 425)
        Me.btn_back.Name = "btn_back"
        Me.btn_back.Size = New System.Drawing.Size(120, 32)
        Me.btn_back.TabIndex = 4
        Me.btn_back.Text = "Back to Menu"
        Me.btn_back.UseVisualStyleBackColor = True
        '
        'frm_coursesbydept_a220564
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(8.0!, 15.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(890, 475)
        Me.Controls.Add(Me.btn_back)
        Me.Controls.Add(Me.grd_courses)
        Me.Controls.Add(Me.cmb_dept)
        Me.Controls.Add(Me.lbl_dept)
        Me.Controls.Add(Me.lbl_title)
        Me.Name = "frm_coursesbydept_a220564"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Courses by Department"
        CType(Me.grd_courses, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub

    Friend WithEvents lbl_title As Label
    Friend WithEvents lbl_dept As Label
    Friend WithEvents cmb_dept As ComboBox
    Friend WithEvents grd_courses As DataGridView
    Friend WithEvents btn_back As Button
End Class
