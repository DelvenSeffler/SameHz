<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frm_studentdetails_a220564
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
        Me.lbl_list = New System.Windows.Forms.Label()
        Me.lst_matric = New System.Windows.Forms.ListBox()
        Me.lbl_matric = New System.Windows.Forms.Label()
        Me.txt_matric = New System.Windows.Forms.TextBox()
        Me.lbl_name = New System.Windows.Forms.Label()
        Me.txt_name = New System.Windows.Forms.TextBox()
        Me.lbl_dept = New System.Windows.Forms.Label()
        Me.txt_dept = New System.Windows.Forms.TextBox()
        Me.lbl_photo = New System.Windows.Forms.Label()
        Me.pic_student = New System.Windows.Forms.PictureBox()
        Me.btn_back = New System.Windows.Forms.Button()
        CType(Me.pic_student, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'lbl_title
        '
        Me.lbl_title.AutoSize = True
        Me.lbl_title.Font = New System.Drawing.Font("Segoe UI", 20.25!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbl_title.Location = New System.Drawing.Point(24, 18)
        Me.lbl_title.Name = "lbl_title"
        Me.lbl_title.Size = New System.Drawing.Size(212, 37)
        Me.lbl_title.TabIndex = 0
        Me.lbl_title.Text = "Student Details"
        '
        'lbl_list
        '
        Me.lbl_list.AutoSize = True
        Me.lbl_list.Font = New System.Drawing.Font("Segoe UI", 10.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbl_list.Location = New System.Drawing.Point(26, 75)
        Me.lbl_list.Name = "lbl_list"
        Me.lbl_list.Size = New System.Drawing.Size(82, 19)
        Me.lbl_list.TabIndex = 1
        Me.lbl_list.Text = "Matric No. :"
        '
        'lst_matric
        '
        Me.lst_matric.Font = New System.Drawing.Font("Segoe UI", 10.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lst_matric.FormattingEnabled = True
        Me.lst_matric.ItemHeight = 17
        Me.lst_matric.Location = New System.Drawing.Point(24, 100)
        Me.lst_matric.Name = "lst_matric"
        Me.lst_matric.Size = New System.Drawing.Size(170, 327)
        Me.lst_matric.TabIndex = 2
        '
        'lbl_matric
        '
        Me.lbl_matric.AutoSize = True
        Me.lbl_matric.Location = New System.Drawing.Point(220, 105)
        Me.lbl_matric.Name = "lbl_matric"
        Me.lbl_matric.Size = New System.Drawing.Size(63, 15)
        Me.lbl_matric.TabIndex = 3
        Me.lbl_matric.Text = "Matric No."
        '
        'txt_matric
        '
        Me.txt_matric.Font = New System.Drawing.Font("Segoe UI", 10.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txt_matric.Location = New System.Drawing.Point(222, 125)
        Me.txt_matric.Name = "txt_matric"
        Me.txt_matric.ReadOnly = True
        Me.txt_matric.Size = New System.Drawing.Size(260, 25)
        Me.txt_matric.TabIndex = 4
        '
        'lbl_name
        '
        Me.lbl_name.AutoSize = True
        Me.lbl_name.Location = New System.Drawing.Point(220, 170)
        Me.lbl_name.Name = "lbl_name"
        Me.lbl_name.Size = New System.Drawing.Size(39, 15)
        Me.lbl_name.TabIndex = 5
        Me.lbl_name.Text = "Name"
        '
        'txt_name
        '
        Me.txt_name.Font = New System.Drawing.Font("Segoe UI", 10.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txt_name.Location = New System.Drawing.Point(222, 190)
        Me.txt_name.Name = "txt_name"
        Me.txt_name.ReadOnly = True
        Me.txt_name.Size = New System.Drawing.Size(260, 25)
        Me.txt_name.TabIndex = 6
        '
        'lbl_dept
        '
        Me.lbl_dept.AutoSize = True
        Me.lbl_dept.Location = New System.Drawing.Point(220, 235)
        Me.lbl_dept.Name = "lbl_dept"
        Me.lbl_dept.Size = New System.Drawing.Size(72, 15)
        Me.lbl_dept.TabIndex = 7
        Me.lbl_dept.Text = "Department"
        '
        'txt_dept
        '
        Me.txt_dept.Font = New System.Drawing.Font("Segoe UI", 10.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txt_dept.Location = New System.Drawing.Point(222, 255)
        Me.txt_dept.Name = "txt_dept"
        Me.txt_dept.ReadOnly = True
        Me.txt_dept.Size = New System.Drawing.Size(260, 25)
        Me.txt_dept.TabIndex = 8
        '
        'lbl_photo
        '
        Me.lbl_photo.AutoSize = True
        Me.lbl_photo.Location = New System.Drawing.Point(520, 105)
        Me.lbl_photo.Name = "lbl_photo"
        Me.lbl_photo.Size = New System.Drawing.Size(83, 15)
        Me.lbl_photo.TabIndex = 9
        Me.lbl_photo.Text = "Student Photo"
        '
        'pic_student
        '
        Me.pic_student.BackgroundImageLayout = System.Windows.Forms.ImageLayout.Zoom
        Me.pic_student.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.pic_student.Location = New System.Drawing.Point(522, 125)
        Me.pic_student.Name = "pic_student"
        Me.pic_student.Size = New System.Drawing.Size(220, 280)
        Me.pic_student.TabIndex = 10
        Me.pic_student.TabStop = False
        '
        'btn_back
        '
        Me.btn_back.Location = New System.Drawing.Point(24, 450)
        Me.btn_back.Name = "btn_back"
        Me.btn_back.Size = New System.Drawing.Size(120, 32)
        Me.btn_back.TabIndex = 11
        Me.btn_back.Text = "Back to Menu"
        Me.btn_back.UseVisualStyleBackColor = True
        '
        'frm_studentdetails_a220564
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(8.0!, 15.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(780, 510)
        Me.Controls.Add(Me.btn_back)
        Me.Controls.Add(Me.pic_student)
        Me.Controls.Add(Me.lbl_photo)
        Me.Controls.Add(Me.txt_dept)
        Me.Controls.Add(Me.lbl_dept)
        Me.Controls.Add(Me.txt_name)
        Me.Controls.Add(Me.lbl_name)
        Me.Controls.Add(Me.txt_matric)
        Me.Controls.Add(Me.lbl_matric)
        Me.Controls.Add(Me.lst_matric)
        Me.Controls.Add(Me.lbl_list)
        Me.Controls.Add(Me.lbl_title)
        Me.Name = "frm_studentdetails_a220564"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Student Details"
        CType(Me.pic_student, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub

    Friend WithEvents lbl_title As Label
    Friend WithEvents lbl_list As Label
    Friend WithEvents lst_matric As ListBox
    Friend WithEvents lbl_matric As Label
    Friend WithEvents txt_matric As TextBox
    Friend WithEvents lbl_name As Label
    Friend WithEvents txt_name As TextBox
    Friend WithEvents lbl_dept As Label
    Friend WithEvents txt_dept As TextBox
    Friend WithEvents lbl_photo As Label
    Friend WithEvents pic_student As PictureBox
    Friend WithEvents btn_back As Button
End Class
