<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frm_mainmenu_a220564
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
        Me.lbl_menutitle = New System.Windows.Forms.Label()
        Me.lbl_welcome = New System.Windows.Forms.Label()
        Me.lbl_date = New System.Windows.Forms.Label()
        Me.btn_coursesdept = New System.Windows.Forms.Button()
        Me.btn_studentdetails = New System.Windows.Forms.Button()
        Me.btn_searchcourses = New System.Windows.Forms.Button()
        Me.btn_studentlist = New System.Windows.Forms.Button()
        Me.btn_logout = New System.Windows.Forms.Button()
        Me.btn_exit = New System.Windows.Forms.Button()
        Me.SuspendLayout()
        '
        'lbl_menutitle
        '
        Me.lbl_menutitle.AutoSize = True
        Me.lbl_menutitle.Font = New System.Drawing.Font("Segoe UI", 24.0!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbl_menutitle.Location = New System.Drawing.Point(28, 22)
        Me.lbl_menutitle.Name = "lbl_menutitle"
        Me.lbl_menutitle.Size = New System.Drawing.Size(211, 45)
        Me.lbl_menutitle.TabIndex = 0
        Me.lbl_menutitle.Text = "MAIN MENU"
        '
        'lbl_welcome
        '
        Me.lbl_welcome.AutoSize = True
        Me.lbl_welcome.Font = New System.Drawing.Font("Segoe UI", 11.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbl_welcome.Location = New System.Drawing.Point(32, 80)
        Me.lbl_welcome.Name = "lbl_welcome"
        Me.lbl_welcome.Size = New System.Drawing.Size(63, 20)
        Me.lbl_welcome.TabIndex = 1
        Me.lbl_welcome.Text = "welcome"
        '
        'lbl_date
        '
        Me.lbl_date.AutoSize = False
        Me.lbl_date.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.lbl_date.Font = New System.Drawing.Font("Segoe UI", 9.75!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbl_date.Location = New System.Drawing.Point(470, 26)
        Me.lbl_date.Name = "lbl_date"
        Me.lbl_date.Size = New System.Drawing.Size(340, 24)
        Me.lbl_date.TabIndex = 2
        Me.lbl_date.Text = "date"
        Me.lbl_date.TextAlign = System.Drawing.ContentAlignment.MiddleRight
        '
        'btn_coursesdept
        '
        Me.btn_coursesdept.Font = New System.Drawing.Font("Segoe UI", 11.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.btn_coursesdept.Location = New System.Drawing.Point(60, 140)
        Me.btn_coursesdept.Name = "btn_coursesdept"
        Me.btn_coursesdept.Size = New System.Drawing.Size(340, 48)
        Me.btn_coursesdept.TabIndex = 3
        Me.btn_coursesdept.Text = "Courses by Department"
        Me.btn_coursesdept.UseVisualStyleBackColor = True
        '
        'btn_studentdetails
        '
        Me.btn_studentdetails.Font = New System.Drawing.Font("Segoe UI", 11.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.btn_studentdetails.Location = New System.Drawing.Point(60, 202)
        Me.btn_studentdetails.Name = "btn_studentdetails"
        Me.btn_studentdetails.Size = New System.Drawing.Size(340, 48)
        Me.btn_studentdetails.TabIndex = 4
        Me.btn_studentdetails.Text = "Student Details"
        Me.btn_studentdetails.UseVisualStyleBackColor = True
        '
        'btn_searchcourses
        '
        Me.btn_searchcourses.Font = New System.Drawing.Font("Segoe UI", 11.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.btn_searchcourses.Location = New System.Drawing.Point(60, 264)
        Me.btn_searchcourses.Name = "btn_searchcourses"
        Me.btn_searchcourses.Size = New System.Drawing.Size(340, 48)
        Me.btn_searchcourses.TabIndex = 5
        Me.btn_searchcourses.Text = "Search for a Course"
        Me.btn_searchcourses.UseVisualStyleBackColor = True
        '
        'btn_studentlist
        '
        Me.btn_studentlist.Font = New System.Drawing.Font("Segoe UI", 11.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.btn_studentlist.Location = New System.Drawing.Point(60, 326)
        Me.btn_studentlist.Name = "btn_studentlist"
        Me.btn_studentlist.Size = New System.Drawing.Size(340, 48)
        Me.btn_studentlist.TabIndex = 6
        Me.btn_studentlist.Text = "Student List"
        Me.btn_studentlist.UseVisualStyleBackColor = True
        '
        'btn_logout
        '
        Me.btn_logout.Location = New System.Drawing.Point(500, 140)
        Me.btn_logout.Name = "btn_logout"
        Me.btn_logout.Size = New System.Drawing.Size(140, 40)
        Me.btn_logout.TabIndex = 7
        Me.btn_logout.Text = "Logout"
        Me.btn_logout.UseVisualStyleBackColor = True
        '
        'btn_exit
        '
        Me.btn_exit.Location = New System.Drawing.Point(500, 198)
        Me.btn_exit.Name = "btn_exit"
        Me.btn_exit.Size = New System.Drawing.Size(140, 40)
        Me.btn_exit.TabIndex = 8
        Me.btn_exit.Text = "Exit"
        Me.btn_exit.UseVisualStyleBackColor = True
        '
        'frm_mainmenu_a220564
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(8.0!, 15.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(840, 420)
        Me.Controls.Add(Me.btn_exit)
        Me.Controls.Add(Me.btn_logout)
        Me.Controls.Add(Me.btn_studentlist)
        Me.Controls.Add(Me.btn_searchcourses)
        Me.Controls.Add(Me.btn_studentdetails)
        Me.Controls.Add(Me.btn_coursesdept)
        Me.Controls.Add(Me.lbl_date)
        Me.Controls.Add(Me.lbl_welcome)
        Me.Controls.Add(Me.lbl_menutitle)
        Me.Name = "frm_mainmenu_a220564"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "UKM Faculty Records - Main Menu"
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub

    Friend WithEvents lbl_menutitle As Label
    Friend WithEvents lbl_welcome As Label
    Friend WithEvents lbl_date As Label
    Friend WithEvents btn_coursesdept As Button
    Friend WithEvents btn_studentdetails As Button
    Friend WithEvents btn_searchcourses As Button
    Friend WithEvents btn_studentlist As Button
    Friend WithEvents btn_logout As Button
    Friend WithEvents btn_exit As Button
End Class
