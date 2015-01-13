<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:template match="eqn">
        <div class="eqn">
            <xsl:attribute name="id"><xsl:value-of select="@id"/></xsl:attribute>
            <xsl:apply-templates/>
        </div>
    </xsl:template>

    <xsl:template match="eqn/table">
        <!-- TODO: line-height = int(leading / 11.5 * 100%) -->
        <div class="table pgwide-1 tablecenter" style="font-size:medium;line-height:117%;">
            <xsl:attribute name="id"><xsl:value-of select="/eqn/table/@id"/></xsl:attribute>
            <div class="tableFullWidth">
                <div class="tableContainer">
                    <table class="frame-none" style="text-align:center;">
                        <colgroup>
                            <xsl:for-each select="tgroup/colspec">
                                <col>
                                    <xsl:attribute name="style">width:<xsl:value-of select="@colwidth"/>;</xsl:attribute>
                                </col>
                            </xsl:for-each>
                        </colgroup>
                        <tbody>
                            <xsl:for-each select="tgroup/tbody/row">
                                <tr class=" row">
                                    <xsl:for-each select="entry">
                                        <td style="text-align:center;">
                                            <xsl:if test="@morerows">
                                                <xsl:attribute name="rowspan"><xsl:value-of select="@morerows + 1"/></xsl:attribute>
                                            </xsl:if>
                                            <xsl:if test="@rowsep = '1'">
                                                <xsl:attribute name="class">rowsep</xsl:attribute>
                                            </xsl:if>
                                            <xsl:attribute name="style">text-align:center;<xsl:if test="@valign">vertical-align:<xsl:value-of select="@valign"/>;</xsl:if></xsl:attribute>
                                            <xsl:value-of select="."/>
                                        </td>
                                    </xsl:for-each>
                                </tr>
                            </xsl:for-each>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="eqn/para">
        <!-- TODO: Revise this so it has a neater way of playing nice with global text() rule -->
        <xsl:for-each select="text">
            <p class="text"><xsl:value-of select="."/></p>
        </xsl:for-each>
        <xsl:apply-templates select="*[not(text())]"/>
    </xsl:template>

</xsl:stylesheet>
